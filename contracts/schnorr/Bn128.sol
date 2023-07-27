// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bn128 {
    using SafeMath for uint256;

    uint256 constant gx = 0x1;
    uint256 constant gy = 0x2;

    /// @dev Order is the number of elements in both G₁ and G₂: 36u⁴+36u³+18u²+6u+1.
    uint256 constant order = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    function getGx() public pure returns (uint256) {
        return gx;
    }

    function getGy() public pure returns (uint256) {
        return gy;
    }

    function getOrder() public pure returns (uint256) {
        return order;
    }

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
