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

import "../components/Proxy.sol";
import "../components/Halt.sol";
import "../components/ReentrancyGuard.sol";
import "./CrossStorage.sol";

/**
 * @title CrossStorageV2
 * @dev Enhanced version of CrossStorage that adds chain ID and fee management functionality
 * This contract inherits from:
 * - CrossStorage: Base storage functionality
 * - ReentrancyGuard: To prevent reentrancy attacks
 * - Halt: To provide emergency stop functionality
 * - Proxy: To enable implementation upgrades
 */
contract CrossStorageV2 is CrossStorage, ReentrancyGuard, Halt, Proxy {

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /** STATE VARIABLES **/
    /**
     * @notice The chain ID of the current network
     * @dev Used to identify the source chain in cross-chain operations
     */
    uint256 public currentChainID;

    /**
     * @notice The address of the contract administrator
     * @dev Has special privileges for managing the contract
     */
    address public admin;

    /** STRUCTURES **/
    /**
     * @notice Parameters for setting cross-chain fees
     * @dev Used when configuring fees for specific chain pairs
     * @param srcChainID Source chain identifier
     * @param destChainID Destination chain identifier
     * @param contractFee Fee charged by the contract
     * @param agentFee Fee charged by the agent
     */
    struct SetFeesParam {
        uint256 srcChainID;
        uint256 destChainID;
        uint256 contractFee;
        uint256 agentFee;
    }

    /**
     * @notice Parameters for retrieving cross-chain fees
     * @dev Used when querying fees for specific chain pairs
     * @param srcChainID Source chain identifier
     * @param destChainID Destination chain identifier
     */
    struct GetFeesParam {
        uint256 srcChainID;
        uint256 destChainID;
    }

    /**
     * @notice Return structure for fee queries
     * @dev Contains the fee information for a specific chain pair
     * @param contractFee Fee charged by the contract
     * @param agentFee Fee charged by the agent
     */
    struct GetFeesReturn {
        uint256 contractFee;
        uint256 agentFee;
    }
}