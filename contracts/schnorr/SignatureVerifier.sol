// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/Halt.sol";
import "../interfaces/ISignatureVerifier.sol";

/**
 * @title IBaseSignVerifier
 * @dev Interface for multi-curve signature verification
 * This interface defines the standard verification method that all curve-specific verifiers must implement
 */
interface IBaseSignVerifier {
    /**
     * @notice Verifies a signature using the specified curve parameters
     * @param signature The signature to verify
     * @param groupKeyX X-coordinate of the group public key
     * @param groupKeyY Y-coordinate of the group public key
     * @param randomPointX X-coordinate of the random point
     * @param randomPointY Y-coordinate of the random point
     * @param message The message that was signed
     * @return bool indicating whether the signature is valid
     */
    function verify(
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external returns (bool);
}

/**
 * @title SignatureVerifier
 * @dev A contract that manages and routes signature verification requests to appropriate curve-specific verifiers
 * This contract acts as a registry and router for different curve implementations
 */
contract SignatureVerifier is Halt {

    /// @notice Mapping from curve ID to its corresponding verifier contract address
    /// @dev Used to route verification requests to the appropriate curve implementation
    mapping(uint256 => address) public verifierMap;

    /**
     * @notice Verifies a signature using the specified curve
     * @dev Routes the verification request to the appropriate curve-specific verifier
     * @param curveId The ID of the curve to use for verification
     * @param signature The signature to verify
     * @param groupKeyX X-coordinate of the group public key
     * @param groupKeyY Y-coordinate of the group public key
     * @param randomPointX X-coordinate of the random point
     * @param randomPointY Y-coordinate of the random point
     * @param message The message that was signed
     * @return bool indicating whether the signature is valid
     * @dev Throws if the curveId is not registered
     */
    function verify(
        uint256 curveId,
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external returns (bool) {
        require(verifierMap[curveId] != address(0), "curveId not correct");
        IBaseSignVerifier verifier = IBaseSignVerifier(verifierMap[curveId]);
        return verifier.verify(signature, groupKeyX, groupKeyY, randomPointX, randomPointY, message);
    }

    /**
     * @notice Registers a new curve verifier
     * @dev Only callable by the contract owner
     * @param curveId The ID of the curve to register
     * @param verifierAddress The address of the curve-specific verifier contract
     */
    function register(uint256 curveId, address verifierAddress) external onlyOwner {
        verifierMap[curveId] = verifierAddress;
    }
}
