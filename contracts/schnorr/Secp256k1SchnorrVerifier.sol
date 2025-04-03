// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./Secp256k1.sol";

/**
 * @title Secp256k1SchnorrVerifier
 * @dev Implementation of Schnorr signature verification for the Secp256k1 curve
 * This contract provides functionality to verify Schnorr signatures using the Secp256k1 elliptic curve
 */
contract Secp256k1SchnorrVerifier is Secp256k1 {
    /**
     * @dev Structure representing a point on the elliptic curve
     * @param x X-coordinate of the point
     * @param y Y-coordinate of the point
     */
    struct Point {
        uint256 x; uint256 y;
    }

    /**
     * @dev Structure containing all the data needed for signature verification
     * @param groupKey The public key point
     * @param randomPoint The random point used in signature generation
     * @param signature The signature value
     * @param message The message that was signed
     * @param _hash The hash value computed during verification
     * @param _left The left side of the verification equation
     * @param _right The right side of the verification equation
     */
    struct Verification {
        Point groupKey;
        Point randomPoint;
        uint256 signature;
        bytes32 message;

        uint256 _hash;
        Point _left;
        Point _right;
    }

    /**
     * @notice Computes the hash value used in Schnorr signature verification
     * @dev Implements the hash function h(m, R) where m is the message and R is the random point
     * @param m The message to be hashed
     * @param a X-coordinate of the random point
     * @param b Y-coordinate of the random point
     * @return The computed hash value
     */
    function h(bytes32 m, uint256 a, uint256 b) public pure returns (uint256) {
        return uint256(sha256(abi.encodePacked(m, uint8(0x04), a, b)));
    }

    /**
     * @notice Performs scalar multiplication on a point
     * @dev Wrapper for the ecmul function from Secp256k1
     * @param x X-coordinate of the input point
     * @param y Y-coordinate of the input point
     * @param scalar The scalar value to multiply by
     * @return The resulting point coordinates
     */
    function cmul(uint256 x, uint256 y, uint256 scalar) public view returns (uint256, uint256) {
        return ecmul(x, y, scalar);
    }

    /**
     * @notice Computes the signature point sG
     * @dev Multiplies the base point G by the signature value
     * @param sig_s The signature value
     * @return The resulting point coordinates
     */
    function sg(uint256 sig_s) public view returns (uint256, uint256) {
        return ecmul(getGx(), getGy(), sig_s);
    }

    /**
     * @notice Performs point addition
     * @dev Wrapper for the ecadd function from Secp256k1
     * @param ax X-coordinate of the first point
     * @param ay Y-coordinate of the first point
     * @param bx X-coordinate of the second point
     * @param by Y-coordinate of the second point
     * @return The resulting point coordinates
     */
    function cadd(uint256 ax, uint256 ay, uint256 bx, uint256 by) public view returns (uint256, uint256) {
        return ecadd(ax, ay, bx, by);
    }

    /**
     * @notice Verifies a Schnorr signature
     * @dev Implements the Schnorr signature verification algorithm
     * The verification checks if sG = R + h(m,R)Y where:
     * - s is the signature
     * - G is the base point
     * - R is the random point
     * - h(m,R) is the hash of the message and random point
     * - Y is the public key
     * @param signature The signature to verify
     * @param groupKeyX X-coordinate of the public key
     * @param groupKeyY Y-coordinate of the public key
     * @param randomPointX X-coordinate of the random point
     * @param randomPointY Y-coordinate of the random point
     * @param message The message that was signed
     * @return bool indicating whether the signature is valid
     */
    function verify(bytes32 signature, bytes32 groupKeyX, bytes32 groupKeyY, bytes32 randomPointX, bytes32 randomPointY, bytes32 message)
        public
        view
        returns(bool)
    {
        bool flag = false;
        Verification memory state;

        state.signature = uint256(signature);
        state.groupKey.x = uint256(groupKeyX);
        state.groupKey.y = uint256(groupKeyY);
        state.randomPoint.x = uint256(randomPointX);
        state.randomPoint.y = uint256(randomPointY);
        state.message = message;

        state._hash = h(state.message, state.randomPoint.x, state.randomPoint.y);

        (state._left.x, state._left.y) = sg(state.signature);
        Point memory rightPart;
        (rightPart.x, rightPart.y) = cmul(state.groupKey.x, state.groupKey.y, state._hash);
        (state._right.x, state._right.y) = cadd(state.randomPoint.x, state.randomPoint.y, rightPart.x, rightPart.y);

        flag = state._left.x == state._right.x && state._left.y == state._right.y;

        return flag;
    }
}