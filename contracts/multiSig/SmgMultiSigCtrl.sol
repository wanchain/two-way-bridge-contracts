// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./IWanchainMPC.sol";

/* 
 * The SmgMultiSigCtrl contract is a 2/2 multi-signature contract that 
 * requires the Storeman Group Nodes to perform MPC threshold signatures to 
 * schedule the proposal, while the Foundation account approve and 
 * executes the proposal tx.
 */

interface IHalt {
    function setHalt(bool) external;
}

contract SmgMultiSigCtrl {
    struct Task {
        address to;
        bytes data;
        bool executed;
    }

    struct SigData {
        bytes32 sigHash;
        bytes32 smgID; 
        bytes r;
        bytes32 s;
    }

    // slip-0044 standands chainId for local chain
    uint256 public chainId;
    address public foundation;
    address public signatureVerifier;
    address public oracle;

    // uid => task
    mapping(bytes32 => Task) public tasks;

    enum GroupStatus { none, initial, curveSeted, failed, selected, ready, unregistered, dismissed }

    modifier onlyFoundation() {
        require(msg.sender == foundation, "not foundation");
        _;
    }

    event SmgScheduled(
        bytes32 indexed uid, 
        address indexed to, 
        bytes data
    );

    event ApprovedAndExecuted(
        bytes32 indexed uid, 
        address indexed to, 
        bytes data
    );

    error SignatureVerifyFailed(
        bytes32 smgID,
        bytes32 sigHash,
        bytes r,
        bytes32 s
    );

    error StoremanGroupNotReady(
        bytes32 smgID,
        uint256 status,
        uint256 timestamp,
        uint256 startTime,
        uint256 endTime
    );
    
    constructor(address _foundation, address _signatureVerifier, address _oracle, uint256 _chainId) {
        foundation = _foundation;
        signatureVerifier = _signatureVerifier;
        chainId = _chainId;
        oracle = _oracle;
    }

    function smgSchedule(
        bytes32 _uid, 
        address _to, 
        bytes memory _data, 
        bytes32 smgID, 
        bytes calldata r, 
        bytes32 s
    ) external {
        require(_data.length > 0, "data is empty");
        require(_to != address(0), "to is empty");
        require(tasks[_uid].to == address(0), "task already exists");

        // hash uniqueId and chainId for replay protection
        bytes32 sigHash = keccak256(abi.encode(_uid, _to, _data, chainId));
        
        // verify signature
        _verifyMpcSignature(
            SigData(
                sigHash, smgID, r, s
            )
        );

        // save task 
        tasks[_uid] = Task(_to, _data, false);
        emit SmgScheduled(_uid, _to, _data);
    }

    function approveAndExecute(
        bytes32 _uid
    ) external onlyFoundation {
        require(tasks[_uid].to != address(0), "task not exists");
        require(!tasks[_uid].executed, "task already executed");
        (bool success, ) = tasks[_uid].to.call(tasks[_uid].data);
        require(success, "call failed");
        tasks[_uid].executed = true;
        emit ApprovedAndExecuted(_uid, tasks[_uid].to, tasks[_uid].data);
    }

    function halt(address _to, bool _halt) external onlyFoundation {
        IHalt(_to).setHalt(_halt);
    }

    function transferFoundation(address _newFoundation) external onlyFoundation {
        foundation = _newFoundation;
    }

    // -------- internal functions --------

    /// @notice                                 check the storeman group is ready or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function _acquireReadySmgInfo(bytes32 smgID)
        internal
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = IWanchainMPC(oracle).getStoremanGroupConfig(smgID);

        if (!(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime)) {
            revert StoremanGroupNotReady({
                smgID: smgID,
                status: uint256(status),
                timestamp: block.timestamp,
                startTime: startTime,
                endTime: endTime
            });
        }

        return (curveID, PK);
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    function _bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    /**
     * @dev Verifies an MPC signature for a given message and Storeman Group ID
     * @param sig The signature to verify
     */
    function _verifyMpcSignature(SigData memory sig) internal {
        uint curveID;
        bytes memory PK;

        // Acquire the curve ID and group public key for the given Storeman Group ID
        (curveID, PK) = _acquireReadySmgInfo(sig.smgID);

        // Extract the X and Y components of the group public key
        bytes32 PKx = _bytesToBytes32(PK, 0);
        bytes32 PKy = _bytesToBytes32(PK, 32);

        // Extract the X and Y components of the signature
        bytes32 Rx = _bytesToBytes32(sig.r, 0);
        bytes32 Ry = _bytesToBytes32(sig.r, 32);

        // Verify the signature using the Wanchain MPC contract
        if (!IWanchainMPC(signatureVerifier).verify(curveID, sig.s, PKx, PKy, Rx, Ry, sig.sigHash)) {
            revert SignatureVerifyFailed({
                smgID: sig.smgID,
                sigHash: sig.sigHash,
                r: sig.r,
                s: sig.s
            });
        }
    }
}