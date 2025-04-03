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
import "./lib/MetricTypes.sol";
import "../interfaces/IConfig.sol";
import "../interfaces/IStoremanGroup.sol";

/**
 * @title MetricStorage
 * @dev Storage contract for metric system
 * This contract stores metrics and slashing data for the storeman group system
 */
contract MetricStorage is BasicStorage {

    /**
     * @dev Events for tracking metric operations
     */

    /**
     * @notice Emitted when a storeman is slashed
     * @param groupId The ID of the storeman group
     * @param hashX The hash of the transaction
     * @param smIndex The index of the slashed storeman
     * @param slshReason The reason for slashing
     */
    event SMSlshLogger(bytes32 indexed groupId, bytes32 indexed hashX, uint8 indexed smIndex, MetricTypes.SlshReason slshReason);

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /**
     * @dev Public storage for metric data
     * @notice Contains all metric-related data structures and mappings
     */
    MetricTypes.MetricStorageData public metricData;

}
