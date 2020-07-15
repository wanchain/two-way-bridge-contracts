pragma solidity ^0.4.24;

import '../lib/SafeMath.sol';



contract Secp256k1 {
    using SafeMath for uint;

    uint256 constant gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 constant gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 constant a = 0;
    uint256 constant b = 7;

    function getGx() public pure returns(uint256) {
        return gx;
    }

    function getGy() public pure returns(uint256) {
        return gy;
    }

    function ecadd(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2)
        public
        view
        returns(uint256 x3, uint256 y3)
    {
        uint256[2] memory outValue;
        uint256[4] memory input;
        input[0] = x1;
        input[1] = y1;
        input[2] = x2;
        input[3] = y2;

        assembly {
            if iszero(staticcall(gas, 66, input, 0x80, outValue, 0x40)) {
                revert(0, 0)
            }
        }

        x3 = outValue[0];
        y3 = outValue[1];
    }

    function ecmul(uint256 x1, uint256 y1, uint256 scalar)
        public
        view
        returns(uint256 x2, uint256 y2)
    {
        uint256[2] memory outValue;
        uint256[3] memory input;
        input[0] = x1;
        input[1] = y1;
        input[2] = scalar;

        assembly {
            if iszero(staticcall(gas, 67, input, 0x60, outValue, 0x40)) {
                revert(0, 0)
            }
        }

        x2 = outValue[0];
        y2 = outValue[1];
    }

}