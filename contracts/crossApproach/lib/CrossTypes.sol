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

import "../../interfaces/IRC20Protocol.sol";
import "../../interfaces/IQuota.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/ISignatureVerifier.sol";
import "./HTLCTxLib.sol";
import "./RapidityTxLib.sol";

/**
 * @title CrossTypes
 * @dev Library containing common types and utilities for cross-chain operations
 * This library provides:
 * - Data structures for cross-chain transactions
 * - Utility functions for address and token operations
 */
library CrossTypes {
    using SafeMath for uint;

    /**
     * @notice Main data structure for cross-chain operations
     * @dev Contains all necessary data and mappings for cross-chain functionality
     */
    struct Data {
        /**
         * @notice HTLC transaction data storage
         * @dev Stores information about Hash Time-Locked Contract transactions
         */
        HTLCTxLib.Data htlcTxData;

        /**
         * @notice Rapidity transaction data storage
         * @dev Stores information about rapid cross-chain transactions
         */
        RapidityTxLib.Data rapidityTxData;

        /**
         * @notice Quota management interface for storeman group
         * @dev Handles quota allocation and management for storeman groups
         */
        IQuota quota;

        /**
         * @notice Token management interface
         * @dev Handles token pair management and cross-chain token operations
         */
        ITokenManager tokenManager;

        /**
         * @notice Storeman group admin interface
         * @dev Manages storeman group administration and configuration
         */
        IStoremanGroup smgAdminProxy;

        /**
         * @notice Storeman group fee admin address
         * @dev Address responsible for managing storeman group fees
         */
        address smgFeeProxy;

        /**
         * @notice Signature verification interface
         * @dev Handles signature verification for cross-chain transactions
         */
        ISignatureVerifier sigVerifier;

        /**
         * @notice Mapping of storeman group fees
         * @dev Maps storeman group IDs to their respective fees
         */
        mapping(bytes32 => uint) mapStoremanFee;

        /**
         * @notice Mapping of contract fees between chains
         * @dev Maps source chain ID and destination chain ID to contract fees
         */
        mapping(uint => mapping(uint =>uint)) mapContractFee;

        /**
         * @notice Mapping of agent fees between chains
         * @dev Maps source chain ID and destination chain ID to agent fees
         */
        mapping(uint => mapping(uint =>uint)) mapAgentFee;
    }

    /**
     * @notice Converts bytes to address
     * @dev Uses assembly to efficiently convert bytes to address
     * @param b Bytes to convert
     * @return addr The converted address
     */
    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    /**
     * @notice Transfers tokens from the contract to a specified address
     * @dev Verifies the transfer was successful by checking balance changes
     * @param tokenScAddr Address of the token contract
     * @param to Address to receive the tokens
     * @param value Amount of tokens to transfer
     * @return bool True if transfer was successful
     * Requirements:
     * - Transfer must succeed
     * - Balance change must match the transfer amount
     */
    function transfer(address tokenScAddr, address to, uint value)
        internal
        returns(bool)
    {
        uint beforeBalance;
        uint afterBalance;
        IRC20Protocol token = IRC20Protocol(tokenScAddr);
        beforeBalance = token.balanceOf(to);
        (bool success,) = tokenScAddr.call(abi.encodeWithSelector(token.transfer.selector, to, value));
        require(success, "transfer failed");
        afterBalance = token.balanceOf(to);
        return afterBalance == beforeBalance.add(value);
    }

    /**
     * @notice Transfers tokens from one address to another
     * @dev Verifies the transfer was successful by checking balance changes
     * @param tokenScAddr Address of the token contract
     * @param from Address to transfer tokens from
     * @param to Address to receive the tokens
     * @param value Amount of tokens to transfer
     * @return bool True if transfer was successful
     * Requirements:
     * - Transfer must succeed
     * - Balance change must match the transfer amount
     */
    function transferFrom(address tokenScAddr, address from, address to, uint value)
        internal
        returns(bool)
    {
        uint beforeBalance;
        uint afterBalance;
        IRC20Protocol token = IRC20Protocol(tokenScAddr);
        beforeBalance = token.balanceOf(to);
        (bool success,) = tokenScAddr.call(abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
        require(success, "transferFrom failed");
        afterBalance = token.balanceOf(to);
        return afterBalance == beforeBalance.add(value);
    }
}
