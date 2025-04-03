// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title Secp256k1Curve
 * @dev Library for operations on the secp256k1 elliptic curve
 * The secp256k1 curve is used in Bitcoin and many other cryptocurrencies for cryptographic operations
 * 
 * Key features:
 * - Point addition on the curve
 * - Scalar multiplication with generator point and arbitrary points
 * - Polynomial commitment calculations
 * - Signature verification
 * 
 * @custom:security
 * - Uses precompiled contracts for efficient and secure curve operations
 * - Input validation for critical operations
 * - Protection against curve-related vulnerabilities
 */
library Secp256k1Curve {
    /**
     * @dev Address of the precompiled contract for secp256k1 curve operations
     * This precompile provides efficient implementations of cryptographic operations
     */
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    /**
     * @dev Add two points on the secp256k1 curve: (x1,y1) + (x2,y2)
     * Point addition is a fundamental operation for elliptic curve cryptography
     * 
     * @param x1 X coordinate of the first point
     * @param y1 Y coordinate of the first point
     * @param x2 X coordinate of the second point
     * @param y2 Y coordinate of the second point
     * 
     * @return retx X coordinate of the resulting point
     * @return rety Y coordinate of the resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:assembly Uses assembly to call the precompiled contract at address 0x42
     */
    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        public
        view
        returns(uint256 retx, uint256 rety, bool success)
    {
        address to = address(0x42);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(),to, freePtr,128, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }
    }

    /**
     * @dev Multiply the generator point G by a scalar
     * The generator point is the standard base point for the secp256k1 curve
     * 
     * @param scalar The scalar value to multiply with
     * 
     * @return x X coordinate of the resulting point
     * @return y Y coordinate of the resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:effects
     * - Calculates scalar * G where G is the generator point
     * - Used for public key generation from private keys
     */
    function mulG(uint256 scalar)
        public
        view
        returns(uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000;//keccak256("mulG(uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(), to, freePtr,36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }
    }

    /**
     * @dev Calculate polynomial commitment for threshold signatures
     * Used in distributed key generation and threshold signature schemes
     * 
     * @param polyCommit The polynomial commitment data
     * @param pk The public key data
     * 
     * @return sx X coordinate of the resulting point
     * @return sy Y coordinate of the resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:security
     * - Validates that input lengths are proper multiples of 64 bytes
     * - Essential for secure threshold signature schemes
     */
    function calPolyCommit(bytes memory polyCommit, bytes memory pk)
        public
        view
        returns(uint256 sx, uint256 sy, bool success)
    {
       address to = PRECOMPILE_CONTRACT_ADDR;
       bytes32 functionSelector = 0x66c85fc200000000000000000000000000000000000000000000000000000000;

       require((polyCommit.length + pk.length)%64 == 0, "error len polyCommint or pk");

       uint polyCommitCnt = polyCommit.length/64;
       uint total = (polyCommitCnt + 1)*2;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr,4), mload(add(polyCommit,32)))
            mstore(add(freePtr,36), mload(add(polyCommit,64)))
            let loopCnt := 1
            for { } lt(loopCnt, polyCommitCnt) { loopCnt := add(loopCnt, 1) } {
                mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0)))
                mstore(add(freePtr, add(4, add(mul(loopCnt, 64), 32))), mload(add(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0), 32)))
            }
            mstore(add(freePtr,    add(4,mul(loopCnt,64))),     mload(add(pk,32)))
            mstore(add(freePtr,add(add(4,mul(loopCnt,64)),32)), mload(add(pk,64)))

            success := staticcall(gas(),to, freePtr,add(mul(total,32),4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    /**
     * @dev Multiply an arbitrary point by a scalar: scalar * (xPk, yPk)
     * General form of scalar multiplication for any point on the curve
     * 
     * @param scalar The scalar value to multiply with
     * @param xPk X coordinate of the point
     * @param yPk Y coordinate of the point
     * 
     * @return x X coordinate of the resulting point
     * @return y Y coordinate of the resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:effects
     * - Calculates scalar * P where P is the point (xPk, yPk)
     * - Used for various cryptographic operations including shared secret computation
     */
    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        address to = address(0x43);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr,32), xPk)
            mstore(add(freePtr,64), yPk)

            success := staticcall(gas(), to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }

    /**
     * @dev Check if two points on the curve are equal
     * Points are equal if their coordinates are identical
     * 
     * @param xLeft X coordinate of the first point
     * @param yLeft Y coordinate of the first point
     * @param xRight X coordinate of the second point
     * @param yRight Y coordinate of the second point
     * 
     * @return bool True if the points are equal, false otherwise
     */
    function equalPt (uint256 xLeft, uint256 yLeft,uint256 xRight, uint256 yRight) public pure returns(bool){
        return xLeft == xRight && yLeft == yRight;
    }

    /**
     * @dev Verify a secp256k1 signature
     * Implements ECDSA signature verification for the secp256k1 curve
     * 
     * @param hash The message hash that was signed
     * @param r The r value of the signature
     * @param s The s value of the signature
     * @param pk The public key to verify against (as bytes containing X and Y coordinates)
     * 
     * @return bool Whether the signature is valid for the given message and public key
     * 
     * @custom:effects
     * - Verifies that the signature is valid for the message hash and public key
     * - Returns false on any verification failure or error
     * - Critical for cross-chain message validation
     */
    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes memory pk) public view returns(bool) {
        bytes32 functionSelector = 0x861731d500000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        uint256 result;
        bool success;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), hash)
            mstore(add(freePtr, 36), r)
            mstore(add(freePtr, 68), s)
            mstore(add(freePtr, 100), mload(add(pk,32)))
            mstore(add(freePtr, 132), mload(add(pk,64)))

            success := staticcall(gas(), to, freePtr,164, freePtr, 32)

            result := mload(freePtr)
        }

        if (success) {
            return result == 1;
        } else {
            return false;
        }
    }
}