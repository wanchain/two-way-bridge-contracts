pragma solidity ^0.4.24;

library Bn128 {
    uint256 constant gx = 0x1;
    uint256 constant gy = 0x2;

    function getGx() external pure returns (uint256) {
        return gx;
    }

    function getGy() external pure returns (uint256) {
        return gy;
    }

    function ecadd(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) external view returns (uint256 x3, uint256 y3) {
        uint256[2] memory outValue;
        uint256[4] memory input;
        input[0] = x1;
        input[1] = y1;
        input[2] = x2;
        input[3] = y2;

        assembly {
            if iszero(staticcall(gas, 0x06, input, 0x80, outValue, 0x40)) {
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
            if iszero(staticcall(gas, 0x07, input, 0x60, outValue, 0x40)) {
                revert(0, 0)
            }
        }

        x2 = outValue[0];
        y2 = outValue[1];
    }
}
