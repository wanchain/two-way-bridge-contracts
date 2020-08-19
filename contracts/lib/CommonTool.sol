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

import "./EnchanceLib.sol";

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
            return EnhancementLib.s256add(x1,y1,x2,y2);
        }

        if (curveType == CurveType.BN) {
            return EnhancementLib.bn256add(x1,y1,x2,y2);
        }
        return EnhancementLib.s256add(x1,y1,x2,y2);
    }

    // mulG
    function mulG(uint256 scalar, CurveType curveType)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
        if (curveType == CurveType.SK) {
            return EnhancementLib.s256MulG(scalar);
        }

        if (curveType == CurveType.BN) {
            return EnhancementLib.bn256MulG(scalar);
        }
        return EnhancementLib.s256MulG(scalar);
    }

    // mulPk
    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk, CurveType curveType)
    public
    view
    returns (uint256 x, uint256 y, bool success){

        if (curveType == CurveType.SK) {
            return EnhancementLib.s256ScalarMul(scalar,xPk,yPk);
        }

        if (curveType == CurveType.BN) {
            return EnhancementLib.bn256ScalarMul(scalar,xPk,yPk);
        }
        return EnhancementLib.s256ScalarMul(scalar,xPk,yPk);
    }

    // calPolyCommit
    function calPolyCommit(bytes polyCommit, bytes pk, CurveType curveType)
    public
    view
    returns (uint256 sx, uint256 sy, bool success) {

        if (curveType == CurveType.SK) {

            return EnhancementLib.s256CalPolyCommit(polyCommit, pk);
        }

        if (curveType == CurveType.BN) {
            return EnhancementLib.bn256CalPolyCommit(polyCommit, pk);
        }
        return EnhancementLib.s256CalPolyCommit(polyCommit, pk);
    }

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes pk) public view returns(bool) {
        return EnhancementLib.checkSig(hash,r,s,pk);
    }



    function bytes2uint(bytes source, uint offset)
    public
    pure
    returns (uint)
    {
        uint number = 0;
        uint8  bytesCount = uint8(source.length);
        uint8  loopCount = 0;
        if(bytesCount < 32) {
            loopCount = bytesCount;
        }else{
            loopCount = 32;
        }
//        for (uint i = 0; i < 32; i++) {
//            number = number + uint8(source[i + offset]) * (2 ** (8 * (32 - (i + 1))));
//        }

        for (uint i = 0; i < loopCount; i++) {
            number = number + uint8(source[i + offset]) * (2 ** (8 * (loopCount - (i + 1))));
        }
        return number;
    }

    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        assembly {
            result := mload(add(source, 32))
        }
    }
}
