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
    enum SlshReason {CM, R, RNK, S, SNK}

    /**
     *
     * EVENTS
     *
     **/
    event SMSlshLogger(bytes indexed grpId, bytes32 indexed hashX, uint8 indexed smIndex, SlshReason slshReason);


/**
 *
 * STRUCTURES
 *
 */
// check sig:
// 1. h = hash(polyCMData.polyCM[0]||polyCMData.polyCM[1]...polyCMData.polyCM[n])
// 2. check h, polyCMData.polyCMR , polyCMData.polyCMS, senderPk
// cm
struct PolyCMData{
bytes[]             polyCM;
bytes               polyCMR;
bytes               polyCMS;
}

// s[i][j]
struct PolyDataPln{
bytes               polyData;
bytes               polyDataR;
bytes               polyDataS;
}

// judge s[i][j]
// check sig:
// 1. h = hash(polyCMData.polyCM[0]||polyCMData.polyCM[1]...polyCMData.polyCM[n])
// 2. check h, polyCMData.polyCMR , polyCMData.polyCMS, senderPk
// 3. h = hash(polyDataPln.polyData)
// 4. check h, polyDataPln.polyDataR, polyDataPln.polyDataS, senderPk

// check content:
//  1. compute left point =  user sender CMG, xvalue = hash(rcvrPK)
//  2. compute right point =  s[i][j]*G
//  3. check left Point == right point
struct RSlshData{
PolyCMData          polyCMData;
PolyDataPln         polyDataPln;
uint8               sndrIndex;
uint8               rcvrIndex;
bool                becauseSndr;
}

// sshare
// check sig
// 1. h = hash(polyDataPln.polyData)
// 2. check h, polyDataPln.polyDataR, polyDataPln.polyDataS, senderPK

// check content: polyDataPln.polyData *G = rpkShare + m * gpkShare
struct SSlshData{
PolyDataPln         polyDataPln;
bytes               m;          // hash(R|| hash(M))
bytes               rpkShare;   // sender's rpkshare
bytes               gpkShare;   // sender's gpkshare
uint8               sndrIndex;
uint8               rcvrIndex;
bool                becauseSndr;
}

struct InctData{
uint256  smIndexes;
}

struct RNWData{
uint256  smIndexes;
}

struct SNWData{
uint256  smIndexes;
}


struct MetricStorageData {

/// @notice transaction fee, hashX => fee
/**
*
* Incentive data
*
**/

/// groupId -> hashx -> InctData
mapping(bytes => mapping(bytes32 => InctData))                          mapInct;


/**
*
* Slash data
*
*/
// cm slsh data
// groupId -> hashx -> smIndex -> CMSlshData
mapping(bytes => mapping(bytes32 => mapping(uint8 => CMSlshData)))     mapCMSlsh;

// R slsh data
    // groupId -> hashx -> smIndex -> SlshData
mapping(bytes => mapping(bytes32 => mapping(uint8 => RSlshData)))      mapRSlsh;
// R No Working data

    // groupId -> hashx -> RNWData(array of the sm index)
mapping(bytes => mapping(bytes32 => RNWData))                           mapRNW;

// S slsh data
    // groupId -> hashx -> smIndex -> SSlshData
mapping(bytes => mapping(bytes32 => mapping(uint8 => SSlshData)))     mapSSlsh;
// S No Working data
    // groupId -> hashx -> SNWData(array of the sm index)
mapping(bytes => mapping(bytes32 => SNWData))                          mapSNW;


/**
*
*  statistics
*
*/
/// grpId -> epochId -> smIndex -> slsh count
mapping(bytes => mapping(uint256 => mapping(uint8 => uint256)))   mapSlshCount;
/// grpId -> epochId -> smIndex -> incentive count
mapping(bytes => mapping(uint256 => mapping(uint8 => uint256)))   mapInctCount;

}

}
