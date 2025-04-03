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
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.8.18;

/**
 * @title GpkTypes
 * @dev Library containing type definitions for Group Public Key (GPK) functionality
 * This library defines the core data structures and enums used throughout the GPK system
 */
library GpkTypes {

    /**
     * @dev Structure representing a storeman group
     * @param groupId Unique identifier for the group
     * @param round Current negotiation round number
     * @param ployCommitPeriod Time period for polynomial commitment submission
     * @param defaultPeriod Default timeout period
     * @param negotiatePeriod Time period for negotiation phase
     * @param roundMap Mapping of rounds and curve indices to Round structures
     * @param smNumber Number of storemen in the group
     * @param addrMap Mapping of indices to storeman addresses
     * @param indexMap Mapping of storeman addresses to their indices
     * @param pkMap Mapping of storeman addresses to their public keys
     */
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

    /**
     * @dev Structure representing a round of GPK generation
     * @param curve Address of the curve contract used for cryptographic operations
     * @param status Current status of the round
     * @param polyCommitCount Number of polynomial commitments received
     * @param checkValidCount Number of valid checks performed
     * @param slashCount Number of slashing events
     * @param statusTime Timestamp of the last status change
     * @param gpk Generated group public key
     * @param srcMap Mapping of storeman addresses to their source data
     */
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

    /**
     * @dev Enumeration of possible GPK round statuses
     * @param PolyCommit Phase where storemen submit polynomial commitments
     * @param Negotiate Phase where storemen negotiate and verify shares
     * @param Complete Phase where GPK generation is completed
     * @param Close Phase where the round is closed
     */
    enum GpkStatus {PolyCommit, Negotiate, Complete, Close}

    /**
     * @dev Structure representing source data for a storeman
     * @param polyCommit Polynomial commitment submitted by the storeman
     * @param gpkShare Share of the group public key
     * @param destMap Mapping of destination addresses to their data
     * @param checkValidCount Number of valid checks received
     * @param slashType Type of slashing event if any
     */
    struct Src {
        bytes polyCommit;
        bytes gpkShare;
        /// txAddress -> Dest
        mapping(address => Dest) destMap;
        uint16 checkValidCount;
        SlashType slashType;
    }

    /**
     * @dev Structure representing destination data for a storeman
     * @param checkStatus Status of the share verification
     * @param setTime Timestamp when the encrypted share was set
     * @param checkTime Timestamp when the share was checked
     * @param sij Secret share value
     * @param ephemPrivateKey Ephemeral private key for encryption
     * @param encSij Encrypted secret share
     */
    struct Dest {
        CheckStatus checkStatus;
        uint setTime;
        uint checkTime;
        uint sij;
        uint ephemPrivateKey;
        bytes encSij;
    }

    /**
     * @dev Enumeration of possible check statuses
     * @param Init Initial state
     * @param Valid Share is valid
     * @param Invalid Share is invalid
     */
    enum CheckStatus {Init, Valid, Invalid}

    /**
     * @dev Enumeration of possible slashing types
     * @param None No slashing
     * @param PolyCommitTimeout Slashing for timeout in polynomial commitment phase
     * @param EncSijTimout Slashing for timeout in encrypted share submission
     * @param CheckTimeout Slashing for timeout in share verification
     * @param SijTimeout Slashing for timeout in share revelation
     * @param SijInvalid Slashing for invalid share
     * @param CheckInvalid Slashing for invalid verification
     * @param Connive Slashing for collusion
     */
    enum SlashType {None, PolyCommitTimeout, EncSijTimout, CheckTimeout, SijTimeout, SijInvalid, CheckInvalid, Connive}
}