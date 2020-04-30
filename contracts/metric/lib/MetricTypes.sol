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

library MetricTypes {

    /**
     *
     * EVENTS
     *
     **/
    event SMSlshLogger(bytes indexed groupId,bytes32 indexed xHash, uint8 indexed smIndex,  SlshReason slshReason);

    enum SlshReason {CM, R, RNK, S, SNK}
    /**
     *
     * STRUCTURES
     *
     */

    struct MetricStorageData {

        /// @notice the fee ratio of revoking operation
        uint revokeFeeRatio;

        /// @notice transaction fee, hashX => fee
        /// groupId -> hashx -> InctData

        /**
        *
        * Incentive data
        *
        */
        mapping(bytes => mapping(bytes32 => InctData))                          mapInct;


        /**
        *
        * Slash data
        *
        */
        // cm slsh data
        // groupId -> hashx -> smIndex -> SlshData
        mapping(bytes => mapping(bytes32 => mapping(uint8  => CMSlshData)))     mapCMSlsh;

        // R slsh data
        mapping(bytes => mapping(bytes32 => mapping(uint8 => RSlshData)))      mapRSlsh;
        // R No Working data
        mapping(bytes => mapping(bytes32 => RNWData))                           mapRNW;

        // S slsh data
        mapping(bytes => mapping(bytes32 => mapping(uint8 => SSlshData)))     mapSSlsh;
        // S No Working data
        mapping(bytes => mapping(bytes32 => SNWData))                          mapSNW;


        /**
        *
        *  statistics
        *
        */
        /// grpId -> epochId -> smIndex -> slsh count
        mapping(bytes => mapping(bytes32 => mapping(uint8  => uint256)))   mapSlshCount;
        /// grpId -> epochId -> smIndex -> incentive count
        /// mapping(bytes => mapping(bytes32 => mapping(uint8  => uint256)))   mapInctCount;

    }

}
