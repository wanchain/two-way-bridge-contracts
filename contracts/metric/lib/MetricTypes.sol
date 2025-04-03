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

import "../../interfaces/IConfig.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../lib/CommonTool.sol";

/**
 * @title MetricTypes
 * @dev Library containing type definitions and data structures for metric operations
 */
library MetricTypes {
    /**
     * @notice Enumeration of possible slash reasons
     * @dev Defines different types of slashing conditions
     * - CM: Commitment mismatch
     * - R: R stage violation
     * - RNK: R stage no key violation
     * - S: S stage violation
     * - SNK: S stage no key violation
     */
    enum SlshReason {CM, R, RNK, S, SNK}

    /**
     * @notice Structure containing polynomial commitment data
     * @dev Contains data related to polynomial commitments
     * @param polyCM Polynomial commitment
     * @param polyCMR R component of polynomial commitment signature
     * @param polyCMS S component of polynomial commitment signature
     */
    struct PolyCMData {
        bytes polyCM;
        bytes32 polyCMR;
        bytes32 polyCMS;
    }

    /**
     * @notice Structure containing polynomial data and its signature
     * @dev Contains polynomial data and its signature components
     * @param polyData Polynomial data
     * @param polyDataR R component of polynomial data signature
     * @param polyDataS S component of polynomial data signature
     */
    struct PolyDataPln {
        bytes polyData;
        bytes32 polyDataR;
        bytes32 polyDataS;
    }

    /**
     * @notice Structure containing R stage slash data
     * @dev Contains data related to R stage slashing
     * @param polyCMData Polynomial commitment data
     * @param polyDataPln Polynomial data and signature
     * @param sndrIndex Index of the sender
     * @param rcvrIndex Index of the receiver
     * @param becauseSndr Whether the slash is due to sender
     * @param curveType Type of curve used
     */
    struct RSlshData {
        PolyCMData polyCMData;
        PolyDataPln polyDataPln;
        uint8 sndrIndex;
        uint8 rcvrIndex;
        bool becauseSndr;
        CommonTool.CurveType curveType;
    }

    /**
     * @notice Structure containing S stage slash data
     * @dev Contains data related to S stage slashing
     * @param polyDataPln Polynomial data and signature
     * @param m Hash of R and hash of M
     * @param rpkShare Receiver public key share
     * @param gpkShare Group public key share
     * @param sndrIndex Index of the sender
     * @param rcvrIndex Index of the receiver
     * @param becauseSndr Whether the slash is due to sender
     * @param curveType Type of curve used
     */
    struct SSlshData {
        PolyDataPln polyDataPln;
        bytes m;          // hash(R|| hash(M))
        bytes rpkShare;
        bytes gpkShare;
        uint8 sndrIndex;
        uint8 rcvrIndex;
        bool becauseSndr;
        CommonTool.CurveType curveType;
    }

    /**
     * @notice Structure containing incentive data
     * @dev Contains data related to incentives
     * @param smIndexes Bitmap of Storeman indexes
     */
    struct InctData {
        uint256 smIndexes;
    }

    /**
     * @notice Structure containing R stage no working data
     * @dev Contains data related to R stage no working status
     * @param smIndexes Bitmap of Storeman indexes
     */
    struct RNWData {
        uint256 smIndexes;
    }

    /**
     * @notice Structure containing S stage no working data
     * @dev Contains data related to S stage no working status
     * @param smIndexes Bitmap of Storeman indexes
     */
    struct SNWData {
        uint256 smIndexes;
    }

    /**
     * @notice Structure containing metric storage data
     * @dev Contains all data related to metric operations
     * @param mapInct Mapping of incentive data by group ID and hash
     * @param mapRSlsh Mapping of R stage slash data by group ID, hash, and Storeman index
     * @param mapRNW Mapping of R stage no working data by group ID and hash
     * @param mapSSlsh Mapping of S stage slash data by group ID, hash, and Storeman index
     * @param mapSNW Mapping of S stage no working data by group ID and hash
     * @param mapSlshCount Mapping of slash counts by group ID, epoch ID, and Storeman index
     * @param mapInctCount Mapping of incentive counts by group ID, epoch ID, and Storeman index
     * @param config Address of the configuration contract
     * @param smg Address of the Storeman group contract
     * @param posLib Address of the POS library contract
     */
    struct MetricStorageData {
        /** Incentive data **/
        /// groupId -> hashx -> InctData
        mapping(bytes32 => mapping(bytes32 => InctData)) mapInct;

        /** R slsh data **/
        // groupId -> hashx -> smIndex -> RSlshData
        mapping(bytes32 => mapping(bytes32 => mapping(uint8 => RSlshData))) mapRSlsh;

        /** R No Working data **/
        // groupId -> hashx -> RNWData
        mapping(bytes32 => mapping(bytes32 => RNWData)) mapRNW;

        /** S slsh data **/
        // groupId -> hashx -> smIndex -> SSlshData
        mapping(bytes32 => mapping(bytes32 => mapping(uint8 => SSlshData))) mapSSlsh;

        /** S No Working data **/
        // groupId -> hashx -> SNWData
        mapping(bytes32 => mapping(bytes32 => SNWData)) mapSNW;

        /** slsh count statistics **/
        /// grpId -> epochId -> smIndex -> slsh count
        mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint256))) mapSlshCount;

        /** incentive count statistics **/
        /// grpId -> epochId -> smIndex -> incentive count
        mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint256))) mapInctCount;

        /// config instance address
        address config;

        /// smg instance address
        address smg;

        /// posLib address
        address posLib;
    }
}
