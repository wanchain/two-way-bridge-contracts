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
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.4.24;

library CreateGpkTypes {

    struct Curve {
        /// curve -> contract address
        mapping(uint8 => address) curveMap;
    }

    struct Group {
        bytes32 groupId;
        uint16 round;
        uint16 curveNumber;
        uint32 ployCommitPeriod;
        uint32 defaultPeriod;
        uint32 negotiatePeriod;
        /// index -> chain
        mapping(uint16 => uint32) chainMap;
        /// chain -> curve
        mapping(uint32 => address) chainCurveMap;
        /// round -> chain -> Round
        mapping(uint16 => mapping(uint32 => Round)) roundMap;
        uint16 smNumber;
        /// index -> txAddress
        mapping(uint => address) indexMap;
        /// txAddress -> pk
        mapping(address => bytes) addressMap;
    }

    struct Round {
        GroupStatus status;
        uint16 polyCommitCount;
        uint32 checkValidCount;
        uint statusTime;
        bytes gpk;
        /// txAddress -> Src
        mapping(address => Src) srcMap;
    }

    enum GroupStatus {PolyCommit, Negotiate, Complete, Close}

    struct Src {
        bytes polyCommit;
        bytes pkShare;
        /// txAddress -> Dest
        mapping(address => Dest) destMap;
    }

    struct Dest {
        CheckStatus checkStatus;
        uint setTime;
        uint checkTime;
        uint sij;
        uint ephemPrivateKey;
        bytes encSij;
    }

    enum CheckStatus {Init, Valid, Invalid}

    enum SlashType {PolyCommitTimeout, EncSijTimout, CheckTimeout, SijTimeout, EncSijInvalid, CheckInvalid, Connive}

    enum CurveType {secp256k1, bn256}
}