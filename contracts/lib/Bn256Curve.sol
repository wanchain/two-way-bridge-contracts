// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title Bn256Curve
 * @dev Library for Bn256 elliptic curve operations
 * The Bn256 (Barreto-Naehrig) curve is optimized for pairing operations and used in zkSNARKs
 * 
 * Key features:
 * - Point addition on Bn256 curve for combining public keys
 * - Scalar multiplication with generator point for key generation
 * - Polynomial commitment calculation for threshold signatures
 * - Public key multiplication for shared secret derivation
 * - Point equality check for verification operations
 * 
 * @custom:security
 * - Precompile contract calls for gas-efficient and secure implementations
 * - Safe memory operations through assembly
 * - Input validation for cryptographic safety
 * - Leverages Ethereum's precompiled contracts at addresses 0x6, 0x7, and 0x268
 */
library Bn256Curve {
    /**
     * @dev Address of the Bn256 precompile contract
     * Used for specialized curve operations beyond the standard precompiles
     * This contract provides extended cryptographic functionality
     */
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    /**
     * @dev Add two points on the Bn256 curve: (x1,y1) + (x2,y2)
     * Point addition is a fundamental operation for elliptic curve cryptography
     * 
     * @param x1 X coordinate of first point
     * @param y1 Y coordinate of first point
     * @param x2 X coordinate of second point
     * @param y2 Y coordinate of second point
     * 
     * @return retx X coordinate of resulting point
     * @return rety Y coordinate of resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:effects
     * - Performs point addition on Bn256 curve using precompile at address 0x6
     * - Used in key aggregation for multi-signature schemes
     * - Fails if either input point is not on the curve
     * - Returns coordinates that represent the geometric sum of the points
     */
    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        public
        view
        returns(uint256 retx, uint256 rety, bool success)
    {
       address to = address(0x6);
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
     * @dev Multiply generator point G by a scalar
     * The generator point is the standard base point for the Bn256 curve
     * 
     * @param scalar The scalar to multiply by
     * 
     * @return x X coordinate of resulting point
     * @return y Y coordinate of resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:effects
     * - Computes scalar * G where G is the generator point of Bn256
     * - Used for deterministic public key generation from private keys
     * - Essential for creating public keys in distributed key generation
     * - More efficient than general scalar multiplication for the generator point
     */
    function mulG(uint256 scalar)
        public
        view
        returns(uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0x0e5725cd00000000000000000000000000000000000000000000000000000000;
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
     * @dev Calculate polynomial commitment for threshold signature schemes
     * Used in distributed key generation protocols and threshold cryptography
     * 
     * @param polyCommit Polynomial commitment data (sequence of curve points)
     * @param pk Public key data (additional curve point)
     * 
     * @return sx X coordinate of resulting commitment point
     * @return sy Y coordinate of resulting commitment point
     * @return success Whether the operation was successful
     * 
     * @custom:requirements
     * - Combined length of polyCommit and pk must be multiple of 64 bytes
     * - Each 64-byte chunk represents a curve point (x,y coordinates)
     * 
     * @custom:effects
     * - Combines multiple commitment points with the public key
     * - Critical for secure distributed key generation
     * - Enables threshold signature schemes across the bridge
     * - Verifies participant contributions in distributed protocols
     */
    function calPolyCommit(bytes memory polyCommit, bytes memory pk)
        public
        view
        returns(uint256 sx, uint256 sy, bool success)
    {
       address to = PRECOMPILE_CONTRACT_ADDR;
       bytes32 functionSelector = 0x77f683ba00000000000000000000000000000000000000000000000000000000;

       require((polyCommit.length + pk.length)%64 == 0, "bn error len polyCommint or pk");

       uint polyCommitCnt = polyCommit.length/64;
       uint total = (polyCommitCnt + 1)*2;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr,4), mload(add(polyCommit,32)))
            mstore(add(freePtr,36), mload(add(polyCommit,64)))
            let loopCnt := 1
            for { } lt(loopCnt, polyCommitCnt) { loopCnt := add(loopCnt, 1) } {
                mstore(add(freePtr,add(4,mul(loopCnt,64))),         mload(add(add(add(polyCommit,32),mul(loopCnt,64)),0)))
                mstore(add(freePtr,add(4,add(mul(loopCnt,64),32))), mload(add(add(add(add(polyCommit,32),mul(loopCnt,64)),0),32)))
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
     * @param scalar The scalar to multiply by
     * @param xPk X coordinate of the point (typically a public key)
     * @param yPk Y coordinate of the point (typically a public key)
     * 
     * @return x X coordinate of resulting point
     * @return y Y coordinate of resulting point
     * @return success Whether the operation was successful
     * 
     * @custom:effects
     * - Computes scalar * P where P is the point (xPk, yPk)
     * - Uses the Bn256 scalar multiplication precompile at address 0x7 (EIP-196)
     * - Used for ECDH (Elliptic Curve Diffie-Hellman) shared secret derivation
     * - Important for secure communication between storeman nodes
     * - More computationally intensive than generator point multiplication
     */
    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        address to = address(0x7);

        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr,0), xPk)
            mstore(add(freePtr,32), yPk)
            mstore(add(freePtr, 64), scalar)

            success := staticcall(gas(), to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }

    /**
     * @dev Check if two elliptic curve points are equal
     * Points are equal if their coordinates are identical
     * 
     * @param xLeft X coordinate of first point
     * @param yLeft Y coordinate of first point
     * @param xRight X coordinate of second point
     * @param yRight Y coordinate of second point
     * 
     * @return bool True if points are equal, false otherwise
     * 
     * @custom:effects
     * - Simply compares coordinates for equality
     * - Used in various verification processes
     * - Helps determine if cryptographic operations produced expected results
     * - Simplifies comparison logic in higher-level protocols
     */
    function equalPt (uint256 xLeft, uint256 yLeft,uint256 xRight, uint256 yRight) public pure returns(bool){
        return xLeft == xRight && yLeft == yRight;
    }
}