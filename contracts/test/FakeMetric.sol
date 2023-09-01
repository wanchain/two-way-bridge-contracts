// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

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
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.8.18;


contract FakeMetric {
    uint[4] c;
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId) external view returns(uint[] memory){
      uint[] memory c2 = new uint[](4);
      for(uint i=0; i<c.length; i++){
        c2[i] = c[i];
      }
      return c2;
    }
    function setC0(uint _c) public {
      c[0] = _c;
    }
    function setC1(uint _c) public {
      c[1] = _c;
      c[2] = _c;
      c[3] = _c;
    }
}
