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

import "../components/BasicStorage.sol";

contract TokenManagerStorage is BasicStorage {
    /************************************************************
     **
     ** STRUCTURE DEFINATIONS
     **
     ************************************************************/

    struct TokenInfo {
        string  name;
        string  symbol;
        uint8   decimals;
    }

    struct AncestorInfo {
      bytes   ancestorAccount;
      string  ancestorName;
      string  ancestorSymbol;
      uint8   ancestorDecimals;
      uint    ancestorChainID;
    }

    struct TokenPairInfo {
      uint      fromChainID;            /// index in coinType.txt; e.g. eth=60, etc=61, wan=5718350
      bytes     fromAccount;            /// from address
      uint      toChainID;              ///
      address   tokenAddress;           /// to token address

      bool      isValid;               /// whether been deleted
    }

    /************************************************************
     **
     ** EVENTS
     **
     ************************************************************/

     event AddToken(address tokenAddress, string name, string symbol, uint8 decimals);
     event AddTokenPair(uint id, uint fromChainID, bytes fromAccount, uint toChainID, address tokenAddress);
    //  event UpdateAncestorInfo(uint id, bytes ancestorAccount, string ancestorName, string ancestorSymbol, uint ancestorChainID);
     event UpdateTokenPair(uint id, bytes ancestorAccount, string ancestorName, string ancestorSymbol, uint8 ancestorDecimals,
      uint ancestorChainID,uint fromChainID, bytes fromAccount, uint toChainID, address tokenAddress, bool isValid);
     event RemoveTokenPair(uint id);
     event MintToken(uint id, address to, uint value);
     event BurnToken(uint id, uint value);
     event AddAdmin(address admin);
     event RemoveAdmin(address admin);
     event UpdateToken(uint id, string name, string symbol);

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