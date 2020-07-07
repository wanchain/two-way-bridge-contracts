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

import "../../lib/Encrypt.sol";
import "../../lib/DataConvert.sol";
import "../../interfaces/IStoremanGroup.sol";
import "./ICurve.sol";
import "./GpkTypes.sol";

library GpkLib {

    /// submit period
    uint32 constant public DEFAULT_PERIOD = 5 * 60;     // 5 minutes
    uint32 constant public PLOYCOMMIT_PERIOD = 10 * 60; // 10 minutes
    uint32 constant public NEGOTIATE_PERIOD = 15 * 60;  // 15 minutes

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for gpk created
    /// @param groupId                    storeman group id
    /// @param gpk1                       group public key for chain1
    /// @param gpk2                       group public key for chain2
    event GpkCreatedLogger(bytes32 indexed groupId, bytes gpk1, bytes gpk2);

    /// @notice                           event for contract slash storeman
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param curve                      signature curve index
    /// @param slashType                  the reason to slash
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  if true, slash src, otherwise slash dest
    event SlashLogger(bytes32 indexed groupId, uint8 indexed round, uint8 indexed curve, uint8 slashType, address src, address dest, bool srcOrDest);

    /// @notice                           event for reset protocol
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    event ResetLogger(bytes32 indexed groupId, uint8 indexed round);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for init period
    /// @param groupId                    storeman group id
    /// @param group                      storeman group
    function initGroup(bytes32 groupId, GpkTypes.Group storage group, GpkTypes.Config storage config, address smg)
        public
    {
        // init period
        if (group.defaultPeriod == 0) {
            group.defaultPeriod = DEFAULT_PERIOD;
            group.ployCommitPeriod = PLOYCOMMIT_PERIOD;
            group.negotiatePeriod = NEGOTIATE_PERIOD;
        }

        // init signature curve
        uint8 curve1;
        uint8 curve2;
        (, curve1, , curve2) = IStoremanGroup(smg).getChainCurve(groupId);
        require(config.curves[curve1] != address(0), "No curve1");
        require(config.curves[curve2] != address(0), "No curve2");
        group.roundMap[group.round][0].curve = config.curves[curve1];
        group.roundMap[group.round][1].curve = config.curves[curve2];
        if (curve1 == curve2) {
            group.curveTypes = 1;
            group.roundMap[group.round][1].status = GpkTypes.GpkStatus.Complete;
        } else {
            group.curveTypes = 2;
        }

        // selected sm list
        group.groupId = groupId;
        group.smNumber = uint8(IStoremanGroup(smg).getSelectedSmNumber(groupId));
        require(group.smNumber > 0, "Invalid number");
        // retrieve nodes
        address txAddress;
        bytes memory pk;
        for (uint i = 0; i < group.smNumber; i++) {
            (txAddress, pk,) = IStoremanGroup(smg).getSelectedSmInfo(groupId, i);
            group.indexMap[i] = txAddress;
            group.addressMap[txAddress] = unifyPk(pk);
        }
    }

    /// @notice                           function for try to complete
    /// @param group                      storeman group
    function tryComplete(GpkTypes.Group storage group, address smg)
        public
    {
        GpkTypes.Round storage round1 = group.roundMap[group.round][0];
        GpkTypes.Round storage round2 = group.roundMap[group.round][1];
        if (group.curveTypes == 1) {
            round2.gpk = round1.gpk;
        }
        if (round1.status == round2.status) {
            IStoremanGroup(smg).setGpk(group.groupId, round1.gpk, round2.gpk);
            emit GpkCreatedLogger(group.groupId, round1.gpk, round2.gpk);
        }
    }

    function unifyPk(bytes pk)
        public
        pure
        returns(bytes)
    {
        if (pk.length == 65) {
            return pk;
        }
        bytes memory uPk = new bytes(65);
        if (pk.length == 64) {
            uPk[0] = 0x04;
            for (uint i = 0; i < 64; i++) {
                uPk[i + 1] = pk[i];
            }
        }
        return uPk;
    }

    /// @notice                           function for generate gpk and pkShare
    /// @param round                      round
    /// @param polyCommit                 poly commit
    function updateGpk(GpkTypes.Round storage round, bytes polyCommit)
        public
    {
        bytes memory gpk = round.gpk;
        uint x = DataConvert.bytes2uint(polyCommit, 1, 32);
        uint y = DataConvert.bytes2uint(polyCommit, 33, 32);
        if (gpk.length != 0) {
            uint gpkX = DataConvert.bytes2uint(gpk, 1, 32);
            uint gpkY = DataConvert.bytes2uint(gpk, 33, 32);
            bool success;
            (x, y, success) = ICurve(round.curve).add(x, y, gpkX, gpkY);
            require(success == true, "Gpk failed");
        } else {
            gpk = new bytes(65);
            gpk[0] = 0x04;
        }
        assembly { mstore(add(gpk, 33), x) }
        assembly { mstore(add(gpk, 65), y) }
        round.gpk = gpk;
    }

    /// @notice                           function for generate gpk and pkShare
    /// @param group                      storeman group
    /// @param round                      round
    /// @param polyCommit                 poly commit
    function updatePkShare(GpkTypes.Group storage group, GpkTypes.Round storage round, bytes polyCommit)
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

            bytes memory pkShare = round.srcMap[txAddress].pkShare;
            if (pkShare.length != 0) {
                uint pkX = DataConvert.bytes2uint(pkShare, 1, 32);
                uint pkY = DataConvert.bytes2uint(pkShare, 33, 32);
                (x, y, success) = ICurve(round.curve).add(x, y, pkX, pkY);
                require(success == true, "Add failed");
            } else {
                pkShare = new bytes(65);
                pkShare[0] = 0x04;
            }
            assembly { mstore(add(pkShare, 33), x) }
            assembly { mstore(add(pkShare, 65), y) }
            round.srcMap[txAddress].pkShare = pkShare;
            if (group.curveTypes == 1) {
                group.roundMap[group.round][1].srcMap[txAddress].pkShare = pkShare;
            }
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
                uint iv = DataConvert.bytes2uint(d.encSij, 65, 16);
                bytes memory cipher;
                (cipher, success) = Encrypt.enc(bytes32(d.ephemPrivateKey), bytes32(iv), d.sij, destPk);
                if (success) {
                    return DataConvert.cmpBytes(d.encSij, cipher);
                }
            }
        }
        return false;
    }

    /// @notice                           function for slash
    /// @param group                      storeman group
    /// @param curve                      signature curve index
    /// @param slashType                  slash reason
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  slash src or dest
    /// @param toReset                    is reset immediately
    function slash(GpkTypes.Group storage group, uint8 curve,
        GpkTypes.SlashType slashType, address src, address dest, bool srcOrDest, bool toReset, address smg)
        public
    {
        emit SlashLogger(group.groupId, group.round, curve, uint8(slashType), src, dest, srcOrDest);
        if (toReset) {
            uint[] memory types = new uint[](1);
            types[0] = uint(slashType);
            address[] memory sms = new address[](1);
            sms[0] = srcOrDest? src : dest;
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

        emit ResetLogger(group.groupId, group.round);
        if (isContinue) {
          group.round++;
        }
    }
}