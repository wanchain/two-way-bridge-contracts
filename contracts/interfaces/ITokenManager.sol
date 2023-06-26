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
//

pragma solidity >=0.8.0;

interface ITokenManager {
    function getTokenPairInfo(uint id) external view
      returns (uint origChainID, bytes memory tokenOrigAccount, uint shadowChainID, bytes memory tokenShadowAccount);

    function getTokenPairInfoSlim(uint id) external view
      returns (uint origChainID, bytes memory tokenOrigAccount, uint shadowChainID);

    function getAncestorInfo(uint id) external view
      returns (bytes memory account, string memory name, string memory symbol, uint8 decimals, uint chainId);

    function mintToken(address tokenAddress, address to, uint value) external;

    function burnToken(address tokenAddress, address from, uint value) external;

    function mapTokenPairType(uint tokenPairID) external view
      returns (uint8 tokenPairType);

    // erc1155
    function mintNFT(uint tokenCrossType, address tokenAddress, address to, uint[] calldata ids, uint[] calldata values, bytes calldata data) external;
    function burnNFT(uint tokenCrossType, address tokenAddress, address from, uint[] calldata ids, uint[] calldata values) external;
}
