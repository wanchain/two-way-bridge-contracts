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

    function bytes2uint(bytes source, uint16 offset, uint16 length)
    public
    pure
    returns(uint)
    {
        uint number = 0;
        for (uint i = 0; i < length; i++) {
            number = number + uint8(source[i + offset]) * (2 ** (8 * (length - (i + 1))));
        }
        return number;
    }

    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        assembly {
            result := mload(add(source, 32))
        }
    }

    function cmpBytes(bytes b1, bytes b2)
    public
    pure
    returns(bool)
    {
        uint len1 = b1.length;
        uint len2 = b2.length; // maybe has padding
        if (len2 >= len1) {
            for (uint i = 0; i < len2; i++) {
                if (i < len1) {
                    if (b1[i] != b2[i]) {
                        return false;
                    }
                } else if (b2[i] != 0x0) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    function enc(bytes32 rbpri, bytes32 iv, uint256 mes, bytes pub)
    public
    view
    returns(bytes, bool success)
    {
        bytes32 functionSelector = 0xa1ecea4b00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        bytes memory cc = new bytes(6*32);
        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), rbpri)
            mstore(add(freePtr, 36), iv)
            mstore(add(freePtr, 68), mes)
            mstore(add(freePtr, 100), mload(add(pub, 32)))
            mstore(add(freePtr, 132), mload(add(pub, 64)))

        // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr, 164, freePtr, 1024)

            let loopCnt := 0
            loop:
            jumpi(loopend, eq(loopCnt, 6))
            mstore(add(cc,mul(add(loopCnt,1),32)),mload(add(freePtr,mul(loopCnt,32))))
            loopCnt := add(loopCnt, 1)
            jump(loop)
            loopend:
        }
        return (cc,success);
    }
}
