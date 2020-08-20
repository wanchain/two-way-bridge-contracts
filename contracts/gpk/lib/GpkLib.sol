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

import "../../lib/CommonTool.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ICurve.sol";
import "../../interfaces/IConfig.sol";
import "./GpkTypes.sol";
import "../../storemanGroupAdmin/StoremanType.sol";


library GpkLib {

    /// submit period
    uint32 constant DEFAULT_PERIOD = 5 * 60;     // 5 minutes
    uint32 constant PLOYCOMMIT_PERIOD = 10 * 60; // 10 minutes
    uint32 constant NEGOTIATE_PERIOD = 15 * 60;  // 15 minutes

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for gpk created
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param gpk1                       group public key for chain1
    /// @param gpk2                       group public key for chain2
    event GpkCreatedLogger(bytes32 indexed groupId, uint16 indexed round, bytes gpk1, bytes gpk2);

    /// @notice                           event for contract slash storeman
    /// @param groupId                    storeman group id
    /// @param slashType                  the reason to slash
    /// @param slashed                    slashed storeman
    /// @param parter                     negotiate parter
    /// @param round                      group negotiate round
    /// @param curveIndex                 signature curve index
    event SlashLogger(bytes32 indexed groupId, uint8 indexed slashType, address indexed slashed, address parter, uint16 round, uint8 curveIndex);

    /// @notice                           event for group reset protocol
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    event ResetLogger(bytes32 indexed groupId, uint16 indexed round);

    /// @notice                           event for group close protocol
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate max round
    event CloseLogger(bytes32 indexed groupId, uint16 indexed round);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for init period
    /// @param groupId                    storeman group id
    /// @param group                      storeman group
    /// @param config                     group config
    /// @param smg                        storeman group contract address
    function initGroup(bytes32 groupId, GpkTypes.Group storage group, address config, address smg)
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
        uint256 curve1;
        uint256 curve2;
        (,status,,,,curve1,curve2,,,,) = IStoremanGroup(smg).getStoremanGroupConfig(groupId);
        require(status == uint8(StoremanType.GroupStatus.selected), "Invalid status");

        group.roundMap[group.round][0].curve = IConfig(config).getCurve(uint8(curve1));
        group.roundMap[group.round][1].curve = IConfig(config).getCurve(uint8(curve2));

        group.groupId = groupId;

        // retrieve selected sm list
        group.smNumber = uint16(IStoremanGroup(smg).getSelectedSmNumber(groupId));
        require(group.smNumber > 0, "Invalid number");
        address txAddress;
        bytes memory pk;
        for (uint i = 0; i < group.smNumber; i++) {
            (txAddress, pk,) = IStoremanGroup(smg).getSelectedSmInfo(groupId, i);
            group.indexMap[i] = txAddress;
            group.addressMap[txAddress] = pk;
        }
    }

    /// @notice                           function for try to complete
    /// @param group                      storeman group
    function tryComplete(GpkTypes.Group storage group, address smg)
        public
    {
        GpkTypes.Round storage round1 = group.roundMap[group.round][0];
        GpkTypes.Round storage round2 = group.roundMap[group.round][1];
        if (round1.status == round2.status) {
            IStoremanGroup(smg).setGpk(group.groupId, round1.gpk, round2.gpk);
            emit GpkCreatedLogger(group.groupId, group.round, round1.gpk, round2.gpk);
        }
    }

    /// @notice                           function for update gpk
    /// @param round                      round
    /// @param polyCommit                 poly commit
    function updateGpk(GpkTypes.Round storage round, bytes polyCommit)
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

    /// @notice                           function for update gpkShare
    /// @param group                      storeman group
    /// @param round                      round
    /// @param polyCommit                 poly commit
    function updateGpkShare(GpkTypes.Group storage group, GpkTypes.Round storage round, bytes polyCommit)
        public
    {
        uint x;
        uint y;
        bool success;
        for (uint i = 0; i < group.smNumber; i++) {
            address txAddress = group.indexMap[i];
            bytes memory pk = group.addressMap[txAddress];
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

    /// @notice                           function for verify sij to judge challenge
    /// @param d                          Dest
    /// @param destPk                     dest storeman pk
    /// @param polyCommit                 polyCommit of pki
    /// @param curve                      curve contract address
    function verifySij(GpkTypes.Dest storage d, bytes destPk, bytes polyCommit, address curve)
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

    /// @notice                           function for slash
    /// @param group                      storeman group
    /// @param curveIndex                 signature curve index
    /// @param slashType                  slash reason
    /// @param slashed                    slashed storeman
    /// @param parter                     negotiate parter
    /// @param toReset                    is reset immediately
    /// @param smg                        the storeman group admin contract
    function slash(GpkTypes.Group storage group, uint8 curveIndex, GpkTypes.SlashType slashType,
        address slashed, address parter, bool toReset, address smg)
        public
    {
        emit SlashLogger(group.groupId, uint8(slashType), slashed, parter, group.round, curveIndex);
        if (toReset) {
            uint[] memory types = new uint[](1);
            types[0] = uint(slashType);
            address[] memory sms = new address[](1);
            sms[0] = slashed;
            bool isContinue = IStoremanGroup(smg).setInvalidSm(group.groupId, types, sms);
            reset(group, isContinue);
        }
    }

    /// @notice                           function for slash
    /// @param group                      storeman group
    /// @param slashNumber                slash number of storemans
    /// @param slashTypes                 slash types
    /// @param slashSms                   slash storeman address
    function slashMulti(GpkTypes.Group storage group, uint slashNumber,
        GpkTypes.SlashType[] slashTypes, address[] slashSms, address smg)
        public
    {
        require(slashNumber > 0, "Not slash");
        uint[] memory types = new uint[](slashNumber);
        address[] memory sms = new address[](slashNumber);
        for (uint i = 0; i < slashNumber; i++) {
          types[i] = uint(slashTypes[i]);
          sms[i] = slashSms[i];
        }
        bool isContinue = IStoremanGroup(smg).setInvalidSm(group.groupId, types, sms);
        reset(group, isContinue);
    }

    /// @notice                           function for reset protocol
    /// @param group                      storeman group
    /// @param isContinue                 is continue to next round
    function reset(GpkTypes.Group storage group, bool isContinue)
        public
    {
        GpkTypes.Round storage round = group.roundMap[group.round][0];
        round.status = GpkTypes.GpkStatus.Close;
        round.statusTime = now;
        round = group.roundMap[group.round][1];
        round.status = GpkTypes.GpkStatus.Close;
        round.statusTime = now;

        // clear data
        for (uint i = 0; i < group.smNumber; i++) {
            delete group.addressMap[group.indexMap[i]];
            delete group.indexMap[i];
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