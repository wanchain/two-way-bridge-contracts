/*

  Copyright 2019 Wanchain Foundation.

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

pragma solidity 0.4.26;

/**
 * Math operations with safety checks
 */

contract TestQuota {

  function mintLock(uint tokenId, bytes32 storemanGroupId, uint value, bool checkQuota) public {}

  function mintRevoke(uint tokenId, bytes32 storemanGroupId, uint value) public {}

  function mintRedeem(uint tokenId, bytes32 storemanGroupId, uint value) public {}

  function fastMint(uint tokenId, bytes32 storemanGroupId, uint value, bool checkQuota) public {}

  function fastBurn(uint tokenId, bytes32 storemanGroupId, uint value, bool checkQuota) public {}

  function burnLock(uint tokenId, bytes32 storemanGroupId, uint value, bool checkQuota) public {}

  function burnRevoke(uint tokenId, bytes32 storemanGroupId, uint value) public {}

  function burnRedeem(uint tokenId, bytes32 storemanGroupId, uint value) public {}

  function debtLock(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) public {}

  function debtRedeem(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) public {}

  function debtRevoke(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) public {}
}
