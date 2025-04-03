// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./IMPC.sol";
import "./ICross.sol";

/**
 * @title GroupApprove
 * @dev Contract that implements a multi-signature governance mechanism for cross-chain operations
 * where proposals require approval from a storeman group before execution
 *
 * @custom:architecture This contract acts as a governance layer for critical cross-chain operations,
 * requiring both foundation proposal and storeman group approval for actions
 */
contract GroupApprove {
    /**
     * @dev Structure representing an executable task
     * @param to Target contract address to call
     * @param data Call data to be executed
     * @param executed Flag indicating if the task has been executed
     */
    struct Task {
        address to;
        bytes data;
        bool executed;
    }

    /**
     * @dev Structure for signature verification data
     * @param sigHash Hash of the message being signed
     * @param smgID Storeman group ID that signed the message
     * @param r R component of the signature (contains X and Y coordinates)
     * @param s S component of the signature
     */
    struct SigData {
        bytes32 sigHash;
        bytes32 smgID; 
        bytes r;
        bytes32 s;
    }

    // slip-0044 chainId
    uint256 public chainId;
    uint256 public taskCount;
    address public foundation;
    address public signatureVerifier;
    address public oracle;

    // proposalId => task
    mapping(uint256 => Task) public tasks;

    /**
     * @dev Enum representing various states a storeman group can be in
     */
    enum GroupStatus { none, initial, curveSet, failed, selected, ready, unregistered, dismissed }

    /**
     * @dev Restricts function access to the foundation address
     */
    modifier onlyFoundation() {
        require(msg.sender == foundation, "not foundation");
        _;
    }

    /**
     * @dev Restricts function access to the contract itself
     * Used for functions that should only be called via executing a task
     */
    modifier onlySelf() {
        require(msg.sender == address(this), "not self");
        _;
    }

    /**
     * @dev Validates signature from a storeman group before executing a function
     * @param proposalId ID of the proposal being approved
     * @param smgID ID of the storeman group signing the approval
     * @param r R component of the signature
     * @param s S component of the signature
     */
    modifier onlySmg(uint proposalId, bytes32 smgID, bytes calldata r, bytes32 s) {
        bytes32 sigHash = keccak256(abi.encode(proposalId, chainId));
        _verifyMpcSignature(
            SigData(
                sigHash, smgID, r, s
            )
        );
        _;
    }

    /**
     * @dev Emitted when a new proposal is created
     * @param proposalId Unique identifier for the proposal
     * @param to Target contract address to call
     * @param data Call data to be executed
     */
    event Proposal(
        uint256 indexed proposalId, 
        address indexed to, 
        bytes data
    );

    /**
     * @dev Emitted when a proposal is approved and executed
     * @param proposalId Unique identifier for the proposal
     * @param to Target contract address that was called
     * @param data Call data that was executed
     * @param smgID ID of the storeman group that approved the proposal
     */
    event ApprovedAndExecuted(
        uint256 indexed proposalId, 
        address indexed to, 
        bytes data,
        bytes32 smgID
    );

    /**
     * @dev Emitted when the foundation address is transferred
     * @param oldFoundation Previous foundation address
     * @param newFoundation New foundation address
     */
    event TransferFoundation(
        address indexed oldFoundation, 
        address indexed newFoundation
    );

    /**
     * @dev Error thrown when signature verification fails
     * @param smgID ID of the storeman group
     * @param sigHash Hash of the signed message
     * @param r R component of the signature
     * @param s S component of the signature
     */
    error SignatureVerifyFailed(
        bytes32 smgID,
        bytes32 sigHash,
        bytes r,
        bytes32 s
    );

    /**
     * @dev Error thrown when a storeman group is not in ready state
     * @param smgID ID of the storeman group
     * @param status Current status of the storeman group
     * @param timestamp Current block timestamp
     * @param startTime Start time of the storeman group
     * @param endTime End time of the storeman group
     */
    error StoremanGroupNotReady(
        bytes32 smgID,
        uint256 status,
        uint256 timestamp,
        uint256 startTime,
        uint256 endTime
    );
    
    /**
     * @dev Constructor initializes the contract with key addresses and validates cross-chain configuration
     * @param _foundation Address of the foundation that can create proposals
     * @param _signatureVerifier Address of the contract used to verify signatures
     * @param _oracle Address of the oracle contract that provides storeman group information
     * @param _cross Address of the cross-chain bridge contract
     *
     * @notice Validates that the provided oracle and signatureVerifier match the ones in the cross contract
     */
    constructor(address _foundation, address _signatureVerifier, address _oracle, address _cross) {
        require(_foundation != address(0), "foundation is empty");
        address _oracleCross;
        address _signatureVerifierCross;

        // cross check oracle and signatureVerifier address with cross contract
        (, _oracleCross, , , _signatureVerifierCross) = ICross(_cross).getPartners();
        oracle = _oracle;
        signatureVerifier = _signatureVerifier;
        require(_oracle == _oracleCross, "oracle not match");
        require(_signatureVerifier == _signatureVerifierCross, "signatureVerifier not match");

        chainId = ICross(_cross).currentChainID(); // read from cross
        require(chainId != 0, "chainId is empty");

        foundation = _foundation;
    }

    /**
     * @dev Creates a new proposal to be executed after storeman group approval
     * @param _chainId Chain ID for which the proposal is intended
     * @param _to Target contract address to call
     * @param _data Call data to be executed
     *
     * @notice Only the foundation can create proposals
     * @notice The chain ID must match the current chain ID
     */
    function proposal(
        uint256 _chainId,
        address _to, 
        bytes memory _data
    ) external onlyFoundation {
        require(_data.length > 0, "data is empty");
        require(_to != address(0), "to is empty");
        require(_chainId == chainId, "chainId not match");

        // save task 
        tasks[taskCount] = Task(_to, _data, false);
        emit Proposal(taskCount, _to, _data);
        taskCount++;
    }

    /**
     * @dev Approves and executes a proposal with storeman group signature
     * @param proposalId ID of the proposal to execute
     * @param smgID ID of the storeman group providing approval
     * @param r R component of the signature
     * @param s S component of the signature
     *
     * @notice Requires valid signature from an active storeman group
     * @notice The task must not have been executed before
     */
    function approveAndExecute(
        uint256 proposalId,
        bytes32 smgID,
        bytes calldata r,
        bytes32 s
    ) external onlySmg(proposalId, smgID, r, s) {
        Task storage task = tasks[proposalId];
        require(task.to != address(0), "task not exists");
        require(!task.executed, "task already executed");

        (bool success, ) = task.to.call(task.data);
        require(success, "call failed");
        task.executed = true;
        emit ApprovedAndExecuted(proposalId, task.to, task.data, smgID);
    }

    /**
     * @dev Sets the halt status of a cross-chain contract
     * @param _to Address of the cross-chain contract to halt or resume
     * @param _halt True to halt, false to resume
     *
     * @notice Only the foundation can call this function
     */
    function halt(address _to, bool _halt) external onlyFoundation {
        ICross(_to).setHalt(_halt);
    }

    /**
     * @dev Transfers the foundation role to a new address
     * @param _newFoundation Address of the new foundation
     *
     * @notice This function can only be called through executing a task
     * @notice Ensures security by requiring both foundation proposal and storeman approval
     */
    function transferFoundation(address _newFoundation) external onlySelf {
        require(_newFoundation != address(0), "new foundation is empty");
        require(_newFoundation != foundation, "new foundation is same as old");
        foundation = _newFoundation;
        emit TransferFoundation(foundation, _newFoundation);
    }

    // -------- internal functions --------

    /**
     * @notice Check if a storeman group is ready and retrieve its cryptographic information
     * @param smgID ID of the storeman group to check
     * @return curveID ID of the elliptic curve used by the storeman group
     * @return PK Public key of the storeman group
     *
     * @dev Reverts if the storeman group is not in ready state or outside its active time window
     */
    function _acquireReadySmgInfo(bytes32 smgID)
        internal
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = IMPC(oracle).getStoremanGroupConfig(smgID);

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

    /**
     * @notice Convert bytes to bytes32 at a specific offset
     * @param b Bytes array to convert
     * @param offset Offset in the bytes array
     * @return result The bytes32 value at the specified offset
     * 
     * @dev Uses assembly for gas-efficient conversion
     */
    function _bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    /**
     * @dev Verifies an MPC signature for a given message and Storeman Group ID
     * @param sig The signature data structure containing all verification components
     *
     * @dev Reverts with SignatureVerifyFailed if verification fails
     * @dev Uses the external signature verifier contract for the actual verification
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
        if (!IMPC(signatureVerifier).verify(curveID, sig.s, PKx, PKy, Rx, Ry, sig.sigHash)) {
            revert SignatureVerifyFailed({
                smgID: sig.smgID,
                sigHash: sig.sigHash,
                r: sig.r,
                s: sig.s
            });
        }
    }
}
