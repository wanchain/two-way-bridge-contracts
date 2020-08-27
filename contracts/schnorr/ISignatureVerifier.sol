// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

/// @dev Signature verifier interface for HTLC contract
interface ISignatureVerifier {
    function verify(
        uint256 curveId,
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external returns (bool);
}

/// @dev for multi curves contract call.
interface IBaseSignVerifier {
    function verify(
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external returns (bool);
}
