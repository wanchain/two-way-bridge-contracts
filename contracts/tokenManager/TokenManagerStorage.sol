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

pragma solidity ^0.4.24;

import "../components/BasicStorage.sol";

contract TokenManagerStorage is BasicStorage {
    /************************************************************
     **
     ** STRUCTURE DEFINATIONS
     **
     ************************************************************/

    /// token info
    struct TokenInfo {
        string              name;                /// token name on wanchain mainnet
        string              symbol;              /// token symbol on wanchain mainnet
        uint8              decimals;            /// token decimals on wanchain mainnet
    }

    /// infomation for a coin crossing a chain from a chain
    struct AncestorInfo {
      bytes32   ancestorAccount;        /// coin's the most primitive address
      string   ancestorName;           /// coin's the most primitive name
      string   ancestorSymbol;         /// coin's the most primitive symbol
      uint8   ancestorDecimals;       /// coin's the most primitive decimals
      uint    ancestorChainID;        /// coin's the most primitive chainID
    }

    struct TokenPairInfo2 {
      uint      fromChainID;            /// index in coinType.txt; e.g. eth=60, etc=61, wan=5718350
      bytes32   fromAccount;            /// from address
      uint      toChainID;              /// same as before
      address   tokenAddress;           /// to token address

      bool      isDelete;               /// whether been deleted
    }

    struct TokenPairInfo {
      uint      fromChainID;            /// index in coinType.txt; e.g. eth=60, etc=61, wan=5718350
      bytes32   fromAccount;            /// from address
      uint      toChainID;              /// same as before
      address   tokenAddress;           /// to token address

      bool      isDelete;               /// whether been deleted
    }

    /**
     *
     * EVENTS
     *
     */
     event TokenAdd(address tokenAddress, string name, string symbol, uint8 decimals);
     event TokenPairAdd(uint id, uint fromChainID, bytes32 fromAccount, uint toChainID, address tokenAddress);
     event UpdateAncestorInfo(uint id, bytes32 ancestorAccount, string ancestorName, string ancestorSymbol, uint ancestorChainID);
     event UpdateTokenPair(uint id, uint fromChainID, bytes32 fromAccount, uint toChainID, address tokenAddress);
     event RemoveTokenPair(uint id);
     event MintToken(uint id, address to, uint value);
     event BurnToken(uint id, uint value);
     event SetFeeRatio(uint fromChainID, uint toChainID, uint feeRatio);
     event AddAdmin(address admin);
     event RemoveAdmin(address admin);

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /// default precision
    uint public constant DEFAULT_PRECISE = 10000;
    /// a time period after which a storeman group could confirm unregister, unit:s
    uint public constant MIN_WITHDRAW_WINDOW = 60 * 60 * 72;
    /// default minimum deposit to register a storeman group
    uint public constant MIN_DEPOSIT = 10 ether;

    /// total amount of TokenPair instance
    uint public totalTokenPairs = 0;
    /// only HTLC contract address can mint and burn token
    mapping(address => bool) public mapAdmin;

    /// a map from a sequence ID to token pair
    mapping(uint => AncestorInfo) public mapAncestorInfo;
    mapping(uint => TokenPairInfo) public mapTokenPairInfo;
    mapping(uint => uint) public mapTokenPairIndex;
}