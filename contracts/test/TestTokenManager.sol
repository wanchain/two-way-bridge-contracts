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

import './IWanToken.sol';

contract TestTokenManager {
    struct TokenPairData {
      uint origChainID;
      bytes32 tokenOrigAccount;
      uint shadowChainID;
      address tokenAddress;
      bool isDelete;
    }

    // id => TokenPairData
    mapping(uint => TokenPairData) mapTokenPair;

    address public crossApproach;

    function setCrossChain(address cross) public {
        require(cross != address(0), "invalid address");
        crossApproach = cross;
    }

    function addTokenPair(uint id, uint origChainID, bytes32 tokenOrigAccount, uint shadowChainID, address tokenAddress)
        public
    {
        TokenPairData memory tokenPairData = TokenPairData({
            origChainID: origChainID,
            shadowChainID: shadowChainID,
            tokenOrigAccount: tokenOrigAccount,
            tokenAddress: tokenAddress,
            isDelete: false
        });

        mapTokenPair[id] = tokenPairData;
    }

    function getTokenPairInfo(uint id) public view
        returns (uint origChainID, bytes32 tokenOrigAccount, uint shadowChainID, address tokenAddress, bool isDelete) {
        TokenPairData storage tokenPairData = mapTokenPair[id];
        return (tokenPairData.origChainID, tokenPairData.tokenOrigAccount,
            tokenPairData.shadowChainID, tokenPairData.tokenAddress, tokenPairData.isDelete);
    }

    function mintToken(uint id, address to,uint value) public {
        TokenPairData storage tokenPairData = mapTokenPair[id];
        IWanToken(tokenPairData.tokenAddress).mint(to, value);
    }

    function burnToken(uint id, uint value) public {
        TokenPairData storage tokenPairData = mapTokenPair[id];
        IWanToken(tokenPairData.tokenAddress).burn(crossApproach, value);
    }
}
