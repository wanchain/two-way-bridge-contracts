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

import "../../lib/CommonTool.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ICurve.sol";
import "../../interfaces/IConfig.sol";
import "./GpkTypes.sol";
import "../../storemanGroupAdmin/StoremanType.sol";

/**
 * @title GpkLib
 * @dev Library containing core functionality for Group Public Key (GPK) operations
 * This library implements the cryptographic operations and protocol logic for GPK generation
 */
library GpkLib {

    /// @dev Default timeout period (2 hours)
    uint32 constant DEFAULT_PERIOD = 2 * 60 * 60;     // 2 hours
    /// @dev Period for polynomial commitment submission (48 hours)
    uint32 constant PLOYCOMMIT_PERIOD = 48 * 60 * 60; // 48 hours
    /// @dev Period for negotiation phase (6 hours)
    uint32 constant NEGOTIATE_PERIOD = 6 * 60 * 60;   // 6 hours

    /**
     * @dev Events for tracking GPK operations
     */

    /**
     * @notice Emitted when a new GPK is created
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param gpk1 The group public key for chain1
     * @param gpk2 The group public key for chain2
     */
    event GpkCreatedLogger(bytes32 indexed groupId, uint16 indexed round, bytes gpk1, bytes gpk2);

    /**
     * @notice Emitted when a storeman is slashed
     * @param groupId The ID of the storeman group
     * @param slashType The reason for slashing
     * @param slashed The address of the slashed storeman
     * @param partner The negotiation partner
     * @param round The current negotiation round
     * @param curveIndex The index of the signature curve
     */
    event SlashLogger(bytes32 indexed groupId, uint8 indexed slashType, address indexed slashed, address partner, uint16 round, uint8 curveIndex);

    /**
     * @notice Emitted when the group protocol is reset
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     */
    event ResetLogger(bytes32 indexed groupId, uint16 indexed round);

    /**
     * @notice Emitted when the group protocol is closed
     * @param groupId The ID of the storeman group
     * @param round The maximum negotiation round
     */
    event CloseLogger(bytes32 indexed groupId, uint16 indexed round);

    /**
     * @dev Core GPK operations
    */

    /**
     * @notice Initializes a storeman group with its configuration
     * @dev Sets up periods, curves, and retrieves storeman information
     * @param groupId The ID of the storeman group
     * @param group The group structure to initialize
     * @param cfg The configuration contract address
     * @param smg The storeman group contract address
     * @param curves Array of curve identifiers (sec256:0, bn256:1)
     * @dev Throws if the group status is invalid
     */
    function initGroup(bytes32 groupId, GpkTypes.Group storage group, address cfg, address smg, uint[] memory curves)
        public
    {
        // init period
        if (group.defaultPeriod == 0) {
            group.defaultPeriod = DEFAULT_PERIOD;
            group.ployCommitPeriod = PLOYCOMMIT_PERIOD;
            group.negotiatePeriod = NEGOTIATE_PERIOD;
        }

        // init signature curve
        uint8 status;
        (,status,,,,,,,,,) = IStoremanGroup(smg).getStoremanGroupConfig(groupId);
        require(status == uint8(StoremanType.GroupStatus.selected), "Invalid stage");

        uint8 i;
        for(i=0; i<curves.length; i++){
            group.roundMap[group.round][i].curve = IConfig(cfg).getCurve(uint8(curves[i]));
        }

        group.groupId = groupId;

        // retrieve selected sm list
        group.smNumber = uint16(IStoremanGroup(smg).getSelectedSmNumber(groupId));
        address txAddress;
        bytes memory pk;
        for (i = 0; i < group.smNumber; i++) {
            (txAddress, pk,) = IStoremanGroup(smg).getSelectedSmInfo(groupId, i);
            group.addrMap[i] = txAddress;
            group.indexMap[txAddress] = i;
            group.pkMap[txAddress] = pk;
        }
    }

    /**
     * @notice Updates the group public key with a new polynomial commitment
     * @dev Performs elliptic curve addition to combine commitments
     * @param round The current round structure
     * @param polyCommit The polynomial commitment to add
     * @dev Throws if the curve addition fails
     */
    function updateGpk(GpkTypes.Round storage round, bytes memory polyCommit)
        public
    {
        bytes memory gpk = round.gpk;
        uint x = CommonTool.bytes2uint(polyCommit, 0, 32);
        uint y = CommonTool.bytes2uint(polyCommit, 32, 32);
        if (gpk.length != 0) {
            uint gpkX = CommonTool.bytes2uint(gpk, 0, 32);
            uint gpkY = CommonTool.bytes2uint(gpk, 32, 32);
            bool success;
            (x, y, success) = ICurve(round.curve).add(x, y, gpkX, gpkY);
            require(success == true, "Gpk failed");
        } else {
            gpk = new bytes(64);
        }
        assembly { mstore(add(gpk, 32), x) }
        assembly { mstore(add(gpk, 64), y) }
        round.gpk = gpk;
    }

    /**
     * @notice Updates the GPK shares for all storemen
     * @dev Calculates and stores individual shares of the group public key
     * @param group The storeman group structure
     * @param round The current round structure
     * @param polyCommit The polynomial commitment to process
     * @dev Throws if polynomial commitment calculation or curve addition fails
     */
    function updateGpkShare(GpkTypes.Group storage group, GpkTypes.Round storage round, bytes memory polyCommit)
        public
    {
        uint x;
        uint y;
        bool success;
        for (uint i = 0; i < group.smNumber; i++) {
            address txAddress = group.addrMap[i];
            bytes memory pk = group.pkMap[txAddress];
            (x, y, success) = ICurve(round.curve).calPolyCommit(polyCommit, pk);
            require(success == true, "PolyCommit failed");

            bytes memory gpkShare = round.srcMap[txAddress].gpkShare;
            if (gpkShare.length != 0) {
                uint pkX = CommonTool.bytes2uint(gpkShare, 0, 32);
                uint pkY = CommonTool.bytes2uint(gpkShare, 32, 32);
                (x, y, success) = ICurve(round.curve).add(x, y, pkX, pkY);
                require(success == true, "Add failed");
            } else {
                gpkShare = new bytes(64);
            }
            assembly { mstore(add(gpkShare, 32), x) }
            assembly { mstore(add(gpkShare, 64), y) }
            round.srcMap[txAddress].gpkShare = gpkShare;
        }
    }

    /**
     * @notice Verifies a secret share against a challenge
     * @dev Checks both the share value and its encryption
     * @param d The destination structure containing the share
     * @param destPk The public key of the destination storeman
     * @param polyCommit The polynomial commitment of the source storeman
     * @param curve The curve contract address
     * @return bool Whether the verification was successful
     */
    function verifySij(GpkTypes.Dest storage d, bytes memory destPk, bytes memory polyCommit, address curve)
        public
        view
        returns(bool)
    {
        // check sij
        uint x;
        uint y;
        uint pcX;
        uint pcY;
        bool success;
        (x, y, success) = ICurve(curve).mulG(d.sij);
        if (success) {
            (pcX, pcY, success) = ICurve(curve).calPolyCommit(polyCommit, destPk);
            if (success && (x == pcX) && (y == pcY)) {
                // check enc
                uint iv = CommonTool.bytes2uint(d.encSij, 65, 16);
                bytes memory cipher;
                (cipher, success) = CommonTool.enc(bytes32(d.ephemPrivateKey), bytes32(iv), d.sij, destPk);
                if (success) {
                    return CommonTool.cmpBytes(d.encSij, cipher);
                }
            }
        }
        return false;
    }

    /**
     * @notice Handles slashing of a storeman
     * @dev Updates slash status and emits events
     * @param group The storeman group structure
     * @param curveIndex The index of the signature curve
     * @param slashType The reason for slashing
     * @param slashed The address of the slashed storeman
     * @param parter The negotiation partner
     * @param toReset Whether to reset the protocol immediately
     * @param smg The storeman group contract address
     */
    function slash(GpkTypes.Group storage group, uint8 curveIndex, GpkTypes.SlashType slashType,
        address slashed, address parter, bool toReset, address smg)
        public
    {
        GpkTypes.Src storage src = group.roundMap[group.round][curveIndex].srcMap[slashed];
        if (src.slashType == GpkTypes.SlashType.None) {
            group.roundMap[group.round][curveIndex].slashCount++;
        }
        if ((slashType == GpkTypes.SlashType.SijInvalid)
         || (slashType == GpkTypes.SlashType.CheckInvalid)
         || (src.slashType == GpkTypes.SlashType.None) 
         || (src.slashType == GpkTypes.SlashType.Connive)) {
            src.slashType = slashType;
        }
        emit SlashLogger(group.groupId, uint8(slashType), slashed, parter, group.round, curveIndex);
        if (toReset) {
            uint[] memory ids = new uint[](1);
            ids[0] = group.indexMap[slashed];
            uint8[] memory types = new uint8[](1);
            types[0] = uint8(slashType);
            bool isContinue = IStoremanGroup(smg).setInvalidSm(group.groupId, ids, types);
            reset(group, isContinue);
        }
    }

    /**
     * @notice Handles slashing of multiple storemen
     * @dev Processes slashing for all invalid storemen in a round
     * @param group The storeman group structure
     * @param curveIndex The index of the signature curve
     * @param smg The storeman group contract address
     */
    function slashMulti(GpkTypes.Group storage group, uint8 curveIndex, address smg)
        public
    {
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        uint[] memory ids = new uint[](round.slashCount);
        uint8[] memory types = new uint8[](round.slashCount);
        uint slashCount = 0;
        for (uint i = 0; (i < group.smNumber) && (slashCount < round.slashCount); i++) {
            GpkTypes.Src storage src = round.srcMap[group.addrMap[i]];
            if (src.slashType != GpkTypes.SlashType.None) {
                ids[slashCount] = i;
                types[slashCount] = uint8(src.slashType);
                slashCount++;
            }
        }
        bool isContinue = IStoremanGroup(smg).setInvalidSm(group.groupId, ids, types);
        reset(group, isContinue);
    }

    /**
     * @notice Resets the GPK protocol for a group
     * @dev Handles protocol reset and group closure
     * @param group The storeman group structure
     * @param isContinue Whether to continue with the protocol
     */
    function reset(GpkTypes.Group storage group, bool isContinue)
        public
    {
        uint8 i;
        while(true) {
            GpkTypes.Round storage round = group.roundMap[group.round][i++];
            if(round.curve == address(0)) {
                break;
            }
            round.status = GpkTypes.GpkStatus.Close;
            round.statusTime = block.timestamp;
        }

        // clear data
        for (i = 0; i < group.smNumber; i++) {
            delete group.pkMap[group.addrMap[i]];
            delete group.indexMap[group.addrMap[i]];
            delete group.addrMap[i];
        }
        group.smNumber = 0;

        if (isContinue) {
          emit ResetLogger(group.groupId, group.round);
          group.round++;
        } else {
          emit CloseLogger(group.groupId, group.round);
        }
    }
}
