// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;
pragma abicoder v2;

import '../crossApproach/lib/EtherTransfer.sol';
import '../schnorr/Bn128SchnorrVerifier.sol';
interface IPartner {
    function getStoremanGroupConfig(
        bytes32 id
    ) external view returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes memory gpk1, bytes memory gpk2, uint startTime, uint endTime);

    function verify(
        uint curveId,
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external view returns (bool);
}

contract Test is Bn128SchnorrVerifier {
    uint testValue = 1;
    address public sigVerifier;
    address public oracle;
    uint256 public currentChainID;

    constructor(address _sigVerifier, address _oracle, uint256 _currentChainID) {
        sigVerifier = _sigVerifier;
        currentChainID = _currentChainID;
        oracle = _oracle;
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    function bytesToBytes32(bytes memory b, uint offset) public pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    function acquireReadySmgInfo(bytes32 smgID) public view returns (uint curveID, bytes memory PK) {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = IPartner(oracle).getStoremanGroupConfig(smgID);

        require(status == 5 && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");

        return (curveID, PK);
    }

    /// @notice             verify signature
    /// @param  curveID     ID of elliptic curve
    /// @param  message     message to be verified
    /// @param  r           Signature info r
    /// @param  s           Signature info s
    function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s) public  {
        bytes32 PKx = bytesToBytes32(PK, 0);
        bytes32 PKy = bytesToBytes32(PK, 32);

        bytes32 Rx = bytesToBytes32(r, 0);
        bytes32 Ry = bytesToBytes32(r, 32);
        testValue++;
        require(IPartner(sigVerifier).verify(curveID, s, PKx, PKy, Rx, Ry, message), "verify failed");
    }

    function getHash(bytes32 uniqueID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount) public view returns (bytes32) {
        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        return mHash;
    }

    function smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s) external  
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }
    function sendValue(uint gasx) external payable {
            EtherTransfer.sendValue(payable(msg.sender), msg.value, gasx);
    }
    function sendValue2() external payable {
            payable(msg.sender).transfer(msg.value);
    }
    function smgRelease2(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s, uint gasx) external payable 
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
        if (value > 0) {
            EtherTransfer.sendValue(payable(msg.sender), value, gasx);
        }
    }
}

