// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Bn128
 * @dev Implementation of the Bn128 elliptic curve operations
 * This contract provides:
 * - Base point (G) coordinates
 * - Curve order
 * - Point addition (ECADD)
 * - Scalar multiplication (ECMUL)
 */
contract Bn128 {
    using SafeMath for uint256;

    /// @notice x-coordinate of the base point G
    uint256 constant gx = 0x1;
    
    /// @notice y-coordinate of the base point G
    uint256 constant gy = 0x2;

    /// @notice Order of the curve
    /// @dev Order is the number of elements in both G₁ and G₂: 36u⁴+36u³+18u²+6u+1
    uint256 constant order = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

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
     * @notice Returns the order of the curve
     * @return Order of the curve
     */
    function getOrder() public pure returns (uint256) {
        return order;
    }

    /**
     * @notice Performs point addition on the curve
     * @dev Adds two points (x1,y1) and (x2,y2) to get (x3,y3)
     * @param x1 x-coordinate of first point
     * @param y1 y-coordinate of first point
     * @param x2 x-coordinate of second point
     * @param y2 y-coordinate of second point
     * @return x3 x-coordinate of resulting point
     * @return y3 y-coordinate of resulting point
     */
    function ecadd(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) public view returns (uint256 x3, uint256 y3) {
        uint256[2] memory outValue;
        uint256[4] memory input;
        input[0] = x1;
        input[1] = y1;
        input[2] = x2;
        input[3] = y2;

        assembly {
            if iszero(staticcall(gas(), 0x06, input, 0x80, outValue, 0x40)) {
                revert(0, 0)
            }
        }

        x3 = outValue[0];
        y3 = outValue[1];
    }

    /**
     * @notice Performs scalar multiplication on the curve
     * @dev Multiplies point (x1,y1) by scalar to get (x2,y2)
     * @param x1 x-coordinate of input point
     * @param y1 y-coordinate of input point
     * @param scalar Scalar value to multiply by
     * @return x2 x-coordinate of resulting point
     * @return y2 y-coordinate of resulting point
     */
    function ecmul(
        uint256 x1,
        uint256 y1,
        uint256 scalar
    ) public view returns (uint256 x2, uint256 y2) {
        uint256[2] memory outValue;
        uint256[3] memory input;
        input[0] = x1;
        input[1] = y1;
        input[2] = scalar;

        assembly {
            if iszero(staticcall(gas(), 0x07, input, 0x60, outValue, 0x40)) {
                revert(0, 0)
            }
        }

        x2 = outValue[0];
        y2 = outValue[1];
    }
}
