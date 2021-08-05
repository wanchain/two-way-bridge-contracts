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

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

interface ITokenManager {
    function getTokenPairInfo(uint id) external view
      returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
    function getTokenInfo(uint id) external view
      returns (address addr, string memory name, string memory symbol, uint8 decimals);
    function getAncestorInfo(uint id) external view
      returns (bytes memory account, bytes memory name, string memory symbol, uint8 decimals, uint chainId);
    function getTokenPairs() external view
      returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals);
    function getTokenPairsByChainID(uint chainID1, uint chainID2) external view
      returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals);

    function mintToken(uint id, address to,uint value) external;

    function burnToken(uint id, uint value) external;
}
