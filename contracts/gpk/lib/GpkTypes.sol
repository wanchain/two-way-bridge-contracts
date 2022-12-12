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

library GpkTypes {

    struct Group {
        bytes32 groupId;
        uint16 round;
        uint32 ployCommitPeriod;
        uint32 defaultPeriod;
        uint32 negotiatePeriod;
        /// round -> curveIndex -> Round
        mapping(uint16 => mapping(uint8 => Round)) roundMap;
        uint16 smNumber;
        /// index -> txAddress
        mapping(uint => address) addrMap;
        /// txAddress -> slectedIndex
        mapping(address => uint) indexMap;
        /// txAddress -> pk
        mapping(address => bytes) pkMap;
    }

    struct Round {
        address curve;
        GpkStatus status;
        uint16 polyCommitCount;
        uint32 checkValidCount;
        uint16 slashCount;
        uint statusTime;
        bytes gpk;
        /// txAddress -> Src
        mapping(address => Src) srcMap;
    }

    enum GpkStatus {PolyCommit, Negotiate, Complete, Close}

    struct Src {
        bytes polyCommit;
        bytes gpkShare;
        /// txAddress -> Dest
        mapping(address => Dest) destMap;
        uint16 checkValidCount;
        SlashType slashType;
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

    enum SlashType {None, PolyCommitTimeout, EncSijTimout, CheckTimeout, SijTimeout, SijInvalid, CheckInvalid, Connive}
}