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

/**
 * @title RapidityTxLib
 * @dev Library for managing rapid cross-chain transaction status
 * This library provides functionality for:
 * - Tracking transaction status
 * - Managing rapid cross-chain transactions
 */
library RapidityTxLib {

    /**
     * @notice Enumeration of possible transaction statuses
     * @dev Defines the states a rapidity transaction can be in
     * - None: Initial state, transaction not yet processed
     * - Redeemed: Transaction has been completed
     */
    enum TxStatus {None, Redeemed}

    /**
     * @notice Main data structure for rapidity transactions
     * @dev Contains mappings for tracking transaction statuses
     * @param mapTxStatus Mapping of transaction unique IDs to their status
     */
    struct Data {
        mapping(bytes32 => TxStatus) mapTxStatus;
    }

    /**
     * @notice Adds a new rapidity transaction
     * @dev Marks a transaction as redeemed when it is added
     * @param self The storage data structure
     * @param uniqueID Unique identifier for the rapidity transaction
     * Requirements:
     * - Transaction must not already exist
     */
    function addRapidityTx(Data storage self, bytes32 uniqueID)
        internal
    {
        TxStatus status = self.mapTxStatus[uniqueID];
        require(status == TxStatus.None, "Rapidity tx exists");
        self.mapTxStatus[uniqueID] = TxStatus.Redeemed;
    }
}
