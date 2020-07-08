/*

  Copyright 2020 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//

pragma solidity ^0.4.24;

import "./SafeMath.sol";

library CommonTool {

    using SafeMath for uint;

    enum CurveType  {SK, BN}

    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    // add
    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2, CurveType curveType)
    public
    view
    returns (uint256 retx, uint256 rety, bool success) {
        if (curveType == CurveType.SK) {
            return s256add(x1,y1,x2,y2);
        }

        if (curveType == CurveType.BN) {
            return bn256add(x1,y1,x2,y2);
        }
        return s256add(x1,y1,x2,y2);
    }

    function s256add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {
        address to = 0x42;
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

        // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr,128, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }

    }

    function bn256add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {
        address to = 0x6;
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

        // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr,128, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }

    }


    // mulG
    function mulG(uint256 scalar, CurveType curveType)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
        if (curveType == CurveType.SK) {
            return s256MulG(scalar);
        }

        if (curveType == CurveType.BN) {
            return bn256MulG(scalar);
        }
        return s256MulG(scalar);
    }

    function s256MulG(uint256 scalar)   public view returns(uint256 x, uint256 y,bool success) {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000;//keccak256("mulG(uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

        // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr,36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }
    function bn256MulG(uint256 scalar)   public view returns(uint256 x, uint256 y,bool success) {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000;//keccak256("mulG(uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

        // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr,36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }


    // mulPk
    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk, CurveType curveType)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        if (curveType == CurveType.SK) {
            return s256ScalarMul(scalar,xPk,yPk);
        }

        if (curveType == CurveType.BN) {
            return bn256ScalarMul(x1,y1,x2,y2);
        }
        return s256ScalarMul(scalar,xPk,yPk);
    }

    function s256ScalarMul(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
        address to = 0x43;
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr,32), xPk)
            mstore(add(freePtr,64), yPk)

            success := staticcall(gas, to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }

    function bn256ScalarMul(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
        address to = 0x7;

        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr,0), xPk)
            mstore(add(freePtr,32), yPk)
            mstore(add(freePtr, 64), scalar)

            success := staticcall(gas, to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }

    // calPolyCommit
    function calPolyCommit(bytes polyCommit, bytes pk, CurveType curveType)
    public
    view
    returns (uint256 sx, uint256 sy, bool success) {

        if (curveType == CurveType.SK) {
            return s256CalPolyCommit(polyCommit, pk);
        }

        if (curveType == CurveType.BN) {
            return bn256CalPolyCommit(polyCommit, pk);
        }
        return s256CalPolyCommit(polyCommit, pk);
    }

    function s256CalPolyCommit(bytes polyCommit, bytes pk) private view returns (uint256 sx, uint256 sy, bool success) {
        bytes32 functionSelector = 0x66c85fc200000000000000000000000000000000000000000000000000000000;
        return polyCal(polyCommit, pk, functionSelector);
    }

    function bn256CalPolyCommit(bytes polyCommit, bytes pk) private view returns (uint256 sx, uint256 sy, bool success) {
        bytes32 functionSelector = 0x77f683ba00000000000000000000000000000000000000000000000000000000;
        return polyCal(polyCommit, pk, functionSelector);
    }

    // checkSig
    function checkSig(bytes32 hash, bytes32 r, bytes32 s, bytes pk)
    public
    view
    returns (bool) {
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
            mstore(add(freePtr, 100), mload(add(pk, 33)))
            mstore(add(freePtr, 132), mload(add(pk, 65)))
            success := staticcall(gas, to, freePtr, 164, freePtr, 32)
            result := mload(freePtr)
        }

        if (success) {
            return result == 1;
        } else {
            return false;
        }
    }

    function bytes2uint(bytes source, uint offset)
    public
    pure
    returns (uint)
    {
        uint number = 0;
        for (uint i = 0; i < 32; i++) {
            number = number + uint8(source[i + offset]) * (2 ** (8 * (32 - (i + 1))));
        }
        return number;
    }

    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        assembly {
            result := mload(add(source, 32))
        }
    }

    function hexStr2bytes(string data)
    private
    view
    returns (bytes){
        uint _ascii_0 = 48;
        uint _ascii_A = 65;
        uint _ascii_a = 97;

        bytes memory a = bytes(data);
        uint[] memory b = new uint[](a.length);

        for (uint i = 0; i < a.length; i++) {
            uint _a = uint(a[i]);

            if (_a > 96) {
                b[i] = _a - 97 + 10;
            }
            else if (_a > 66) {
                b[i] = _a - 65 + 10;
            }
            else {
                b[i] = _a - 48;
            }
        }

        bytes memory c = new bytes(b.length / 2);
        for (uint _i = 0; _i < b.length; _i += 2) {
            c[_i / 2] = byte(b[_i] * 16 + b[_i + 1]);
        }

        return c;
    }
}
