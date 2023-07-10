// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./EllipticCurve.sol";

contract Bn128G1 {
    using SafeMath for uint256;

    uint256 constant gx = 0x1;
    uint256 constant gy = 0x2;

    /// @dev Order is the number of elements in both G₁ and G₂: 36u⁴+36u³+18u²+6u+1.
    uint256 constant order = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Constant `a` of EC equation
    uint256 internal constant AA = 0;
    // Constant `b` of EC equation
    uint256 internal constant BB = 3;
    // Prime number of the curve
    uint256 internal constant PP = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47;
    // Order of the curve
    uint256 internal constant NN = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;

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
        (x3, y3) = EllipticCurve.ecAdd(x1, y1, x2, y2, AA, PP);
    }

    function ecmul(
        uint256 x1,
        uint256 y1,
        uint256 scalar
    ) public view returns (uint256 x2, uint256 y2) {
        (x2, y2) = EllipticCurve.ecMul(scalar, x1, y1, AA, PP);
    }
}
