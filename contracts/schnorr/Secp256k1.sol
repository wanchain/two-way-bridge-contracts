pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";

contract Secp256k1 {
    using SafeMath for uint256;

    uint256 constant gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 constant gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 constant a = 0;
    uint256 constant b = 7;

    function getGx() public pure returns (uint256) {
        return gx;
    }

    function getGy() public pure returns (uint256) {
        return gy;
    }

    function ecadd(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) public view returns (uint256 retx, uint256 rety) {
        address to = 0X42;
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

            if iszero(staticcall(gas, to, freePtr, 132, freePtr, 64)) {
                revert(0, 0)
            }

            retx := mload(freePtr)
            rety := mload(add(freePtr, 32))
        }
    }

    function ecmul(
        uint256 xPk,
        uint256 yPk,
        uint256 scalar
    ) public view returns (uint256 x, uint256 y) {
        address to = 0x43;
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr, 32), xPk)
            mstore(add(freePtr, 64), yPk)

            if iszero(staticcall(gas, to, freePtr, 96, freePtr, 64)) {
                revert(0,0)
            }

            x := mload(freePtr)
            y := mload(add(freePtr, 32))
        }
    }
}
