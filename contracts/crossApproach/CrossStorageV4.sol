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

import "./CrossStorageV3.sol";

/**
 * @title CrossStorageV4
 * @dev Enhanced version of CrossStorageV3 that adds batch processing, gas limits, and role-based access control
 * This contract inherits from CrossStorageV3 and provides:
 * - Maximum batch size configuration
 * - Gas limit settings for ether transfers
 * - Hash function type selection
 * - Role-based access control for admin and operator roles
 */
contract CrossStorageV4 is CrossStorageV3 {

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/
    /**
     * @notice Maximum number of transactions that can be processed in a single batch
     * @dev Used to limit the size of batch operations for gas optimization
     */
    uint internal maxBatchSize;

    /**
     * @notice Gas limit for ether transfer operations
     * @dev Used to estimate gas costs for cross-chain ether transfers
     */
    uint internal etherTransferGasLimit;

    /**
     * @notice Type of hash function to be used
     * @dev 0: sha256, 1: keccak256
     * Used for generating transaction hashes in cross-chain operations
     */
    uint public hashType; // 0: sha256, 1: keccak256

    /**
     * @notice Mapping of addresses to admin role status
     * @dev Used for role-based access control of administrative functions
     */
    mapping(address => bool) public isAdmin;

    /**
     * @notice Mapping of addresses to operator role status
     * @dev Used for role-based access control of operational functions
     */
    mapping(address => bool) public isOperator;
}
