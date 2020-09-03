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

// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

library FakeCommonTool {

    enum CurveType  {SK, BN}

    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    bool constant encResult = true;
    bytes constant encValue = "0x0123456789abcdef";    

    function bytes2uint(bytes memory source, uint16 offset, uint16 length)
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

    function cmpBytes(bytes memory b1, bytes memory b2)
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

    function enc(bytes32 rbpri, bytes32 iv, uint256 mes, bytes memory pub)
    public
    pure
    returns(bytes memory, bool success)
    {
        return (encValue, encResult);
    }
}
