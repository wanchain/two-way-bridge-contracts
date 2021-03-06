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

interface IQuota {
  function userMintLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userMintRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userMintRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgMintLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgMintRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgMintRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function userBurnLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userBurnRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userBurnRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgBurnLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgBurnRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgBurnRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function userFastMint(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userFastBurn(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgFastMint(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgFastBurn(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function assetLock(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function assetRedeem(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function assetRevoke(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;

  function debtLock(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function debtRedeem(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function debtRevoke(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;

  function getUserMintQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);
  function getSmgMintQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);

  function getUserBurnQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);
  function getSmgBurnQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);

  function getAsset(uint tokenId, bytes32 storemanGroupId) external view returns (uint asset, uint asset_receivable, uint asset_payable);
  function getDebt(uint tokenId, bytes32 storemanGroupId) external view returns (uint debt, uint debt_receivable, uint debt_payable);

  function isDebtClean(bytes32 storemanGroupId) external view returns (bool);
}
