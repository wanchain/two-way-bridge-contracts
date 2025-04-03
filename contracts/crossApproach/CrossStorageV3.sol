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

import "./CrossStorageV2.sol";

/**
 * @title CrossStorageV3
 * @dev Enhanced version of CrossStorageV2 that adds token pair fee management functionality
 * This contract inherits from CrossStorageV2 and provides:
 * - Mapping for token pair contract fees
 * - Structure for setting token pair fees
 */
contract CrossStorageV3 is CrossStorageV2 {

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    /** STATE VARIABLES **/
    /**
     * @notice Mapping from token pair ID to contract fee
     * @dev Used to store and retrieve fees for specific token pairs
     * @param tokenPairID Unique identifier for a token pair
     * @return contractFee The fee charged by the contract for this token pair
     */
    mapping(uint256 => uint256) mapTokenPairContractFee;

    /**
     * @notice Parameters for setting token pair fees
     * @dev Used when configuring fees for specific token pairs
     * @param tokenPairID Unique identifier for a token pair
     * @param contractFee The fee to be charged by the contract for this token pair
     */
    struct SetTokenPairFeesParam {
        uint256 tokenPairID;
        uint256 contractFee;
    }

}