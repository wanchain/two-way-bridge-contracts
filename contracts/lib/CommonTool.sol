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

library CommonTool {

    enum CurveType  {SK, BN}

    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes pk) public view returns(bool) {
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
            mstore(add(freePtr, 100), mload(add(pk,32)))
            mstore(add(freePtr, 132), mload(add(pk,64)))

            success := staticcall(gas, to, freePtr,164, freePtr, 32)

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
