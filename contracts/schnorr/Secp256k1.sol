// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Secp256k1
 * @dev Implementation of the Secp256k1 elliptic curve operations
 * This contract provides:
 * - Base point (G) coordinates
 * - Curve parameters (a, b, n)
 * - Point addition (ECADD)
 * - Scalar multiplication (ECMUL)
 */
contract Secp256k1 {
    using SafeMath for uint256;

    /// @notice x-coordinate of the base point G
    uint256 constant gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    
    /// @notice y-coordinate of the base point G
    uint256 constant gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    
    /// @notice Order of the curve
    uint256 constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    
    /// @notice Coefficient a of the curve equation y² = x³ + ax + b
    uint256 constant a = 0;
    
    /// @notice Coefficient b of the curve equation y² = x³ + ax + b
    uint256 constant b = 7;

    /**
     * @notice Returns the x-coordinate of the base point G
     * @return x-coordinate of G
     */
    function getGx() public pure returns (uint256) {
        return gx;
    }

    /**
     * @notice Returns the y-coordinate of the base point G
     * @return y-coordinate of G
     */
    function getGy() public pure returns (uint256) {
        return gy;
    }

    /**
     * @notice Performs point addition on the curve
     * @dev Adds two points (x1,y1) and (x2,y2) to get (retx,rety)
     * @param x1 x-coordinate of first point
     * @param y1 y-coordinate of first point
     * @param x2 x-coordinate of second point
     * @param y2 y-coordinate of second point
     * @return retx x-coordinate of resulting point
     * @return rety y-coordinate of resulting point
     */
    function ecadd(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) public view returns (uint256 retx, uint256 rety) {
        address to = address(0x42);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

            if iszero(staticcall(gas(), to, freePtr, 132, freePtr, 64)) {
                revert(0, 0)
            }

            retx := mload(freePtr)
            rety := mload(add(freePtr, 32))
        }
    }

    /**
     * @notice Performs scalar multiplication on the curve
     * @dev Multiplies point (xPk,yPk) by scalar to get (x,y)
     * @param xPk x-coordinate of input point
     * @param yPk y-coordinate of input point
     * @param scalar Scalar value to multiply by
     * @return x x-coordinate of resulting point
     * @return y y-coordinate of resulting point
     */
    function ecmul(
        uint256 xPk,
        uint256 yPk,
        uint256 scalar
    ) public view returns (uint256 x, uint256 y) {
        address to = address(0x43);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr, 32), xPk)
            mstore(add(freePtr, 64), yPk)

            if iszero(staticcall(gas(), to, freePtr, 96, freePtr, 64)) {
                revert(0,0)
            }

            x := mload(freePtr)
            y := mload(add(freePtr, 32))
        }
    }
}
