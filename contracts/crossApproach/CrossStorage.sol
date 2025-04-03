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
import "./lib/CrossTypes.sol";
import "./lib/HTLCTxLib.sol";
import "./lib/RapidityTxLib.sol";

/**
 * @title CrossStorage
 * @dev Storage contract for cross-chain functionality that manages cross-chain related data
 * This contract inherits from BasicStorage and provides storage for:
 * - HTLC (Hash Time-Locked Contract) transactions
 * - Rapidity transactions
 * - Cross-chain types and data
 */
contract CrossStorage is BasicStorage {
    using HTLCTxLib for HTLCTxLib.Data;
    using RapidityTxLib for RapidityTxLib.Data;

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /**
     * @dev Internal storage for cross-chain related data
     */
    CrossTypes.Data internal storageData;

    /**
     * @notice Time period for which assets are locked in HTLC transactions
     * @dev Default value is 36 hours (3600*36 seconds)
     */
    uint public lockedTime = uint(3600*36);

    /**
     * @notice Timeout period for storeman group fee receiver address changes
     * @dev Since storeman group admin receiver address may be changed, system ensures:
     * - New address becomes valid after this timeout
     * - Old address becomes invalid after this timeout
     * Default value is 10 minutes (10*60 seconds)
     */
    uint public smgFeeReceiverTimeout = uint(10*60);

    /**
     * @notice Enumeration of possible states for a storeman group
     * @dev States:
     * - none: Initial state
     * - initial: Group has been initialized
     * - curveSeted: Curve parameters have been set
     * - failed: Group setup has failed
     * - selected: Group has been selected
     * - ready: Group is ready for operations
     * - unregistered: Group has been unregistered
     * - dismissed: Group has been dismissed
     */
    enum GroupStatus { none, initial, curveSeted, failed, selected, ready, unregistered, dismissed }

}