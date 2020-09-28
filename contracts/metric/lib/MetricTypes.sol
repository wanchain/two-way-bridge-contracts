/*

  Copyright 2020 Wanchain Foundation.

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

pragma experimental ABIEncoderV2;
pragma solidity ^0.4.24;

import "../../interfaces/IConfig.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../lib/CommonTool.sol";

library MetricTypes {
    enum SlshReason {CM, R, RNK, S, SNK}

    struct PolyCMData {
        bytes polyCM;
        bytes32 polyCMR;
        bytes32 polyCMS;
    }

    struct PolyDataPln {
        bytes polyData;
        bytes32 polyDataR;
        bytes32 polyDataS;
    }

    struct RSlshData {
        PolyCMData polyCMData;
        PolyDataPln polyDataPln;
        uint8 sndrIndex;
        uint8 rcvrIndex;
        bool becauseSndr;
        CommonTool.CurveType curveType;
    }

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

    struct InctData {
        uint256 smIndexes;
    }

    struct RNWData {
        uint256 smIndexes;
    }

    struct SNWData {
        uint256 smIndexes;
    }


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
