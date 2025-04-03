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

pragma solidity ^0.8.18;

import "../components/BasicStorage.sol";

/**
 * @title TokenManagerStorage
 * @dev Storage contract for token management functionality
 * This contract provides:
 * - Token pair information storage
 * - Ancestor token information storage
 * - Token pair mapping and indexing
 */
contract TokenManagerStorage is BasicStorage {
    /************************************************************
     **
     ** STRUCTURE DEFINATIONS
     **
     ************************************************************/

    /**
     * @notice Structure for storing ancestor token information
     * @dev Contains basic information about the original token
     * @param account Address of the token contract
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param decimals Number of decimal places
     * @param chainID ID of the blockchain where the token originates
     */
    struct AncestorInfo {
      bytes   account;
      string  name;
      string  symbol;
      uint8   decimals;
      uint    chainID;
    }

    /**
     * @notice Structure for storing token pair information
     * @dev Contains information about token pairs for cross-chain operations
     * @param aInfo Information about the ancestor token
     * @param fromChainID ID of the source blockchain (e.g., eth=60, etc=61, wan=5718350)
     * @param fromAccount Address of the token on the source chain
     * @param toChainID ID of the destination blockchain
     * @param toAccount Address of the token on the destination chain
     */
    struct TokenPairInfo {
      AncestorInfo aInfo;
      uint      fromChainID;
      bytes     fromAccount;
      uint      toChainID;
      bytes     toAccount;
    }
    
    /**
     * @notice Structure for storing complete token pair information
     * @dev Extends TokenPairInfo with a unique identifier
     * @param id Unique identifier for the token pair
     * @param aInfo Information about the ancestor token
     * @param fromChainID ID of the source blockchain
     * @param fromAccount Address of the token on the source chain
     * @param toChainID ID of the destination blockchain
     * @param toAccount Address of the token on the destination chain
     */
    struct TokenPairInfoFull {
      uint      id;
      AncestorInfo aInfo;
      uint      fromChainID;
      bytes     fromAccount;
      uint      toChainID;
      bytes     toAccount;
    }


    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /// @notice Total number of token pairs registered in the system
    uint public totalTokenPairs = 0;

    /// @notice Mapping from token pair ID to token pair information
    mapping(uint => TokenPairInfo) public mapTokenPairInfo;
    
    /// @notice Mapping from index to token pair ID for enumeration
    mapping(uint => uint) public mapTokenPairIndex;
}