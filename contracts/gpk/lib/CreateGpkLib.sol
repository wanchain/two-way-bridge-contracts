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
import "./CreateGpkTypes.sol";

library CreateGpkLib {

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
    /// @param round                      group reset times
    /// @param chain                      chain to use this gpk
    /// @param slashType                  the reason to slash
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  if true, slash src, otherwise slash dest
    event SlashLogger(bytes32 indexed groupId, uint16 indexed round, uint32 chain, uint8 slashType, address src, address dest, bool srcOrDest);

    /// @notice                           event for reset protocol
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    event ResetLogger(bytes32 indexed groupId, uint16 indexed round);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for init period
    /// @param groupId                    storeman group id
    /// @param group                      storeman group
    function initGroup(bytes32 groupId, CreateGpkTypes.Group storage group, CreateGpkTypes.Curve storage curves, address smg)
        public
    {
        // init period
        if (group.defaultPeriod == 0) { // may have been set in advance
            group.ployCommitPeriod = 10 * 60;
            group.defaultPeriod = 5 * 60;
            group.negotiatePeriod = 15 * 60;
        }

        // init chain curve
        uint32 chain1;
        uint8 curve1;
        uint32 chain2;
        uint8 curve2;
        (chain1, curve1, chain2, curve2) = IStoremanGroup(smg).getChainCurve(groupId);
        require(curves.curveMap[curve1] != address(0), "No curve");
        require(curves.curveMap[curve2] != address(0), "No curve");
        group.chainMap[0] = chain1;
        group.chainMap[1] = chain2;
        group.chainCurveMap[chain1] = curves.curveMap[curve1];
        group.chainCurveMap[chain2] = curves.curveMap[curve2];
        if (curve1 == curve2) {
            group.curveNumber = 1;
            group.roundMap[group.round][group.chainMap[1]].status = CreateGpkTypes.GroupStatus.Complete;
        } else {
            group.curveNumber = 2;
        }

        // selected sm list
        group.groupId = groupId;
        group.smNumber = uint16(IStoremanGroup(smg).getSelectedSmNumber(groupId));
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
    function tryComplete(CreateGpkTypes.Group storage group, address smg)
        public
    {
        CreateGpkTypes.Round storage round1 = group.roundMap[group.round][group.chainMap[0]];
        CreateGpkTypes.Round storage round2 = group.roundMap[group.round][group.chainMap[1]];
        if (group.curveNumber == 1) {
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
    /// @param curve                      curve contract address
    function updateGpk(CreateGpkTypes.Round storage round, bytes polyCommit, address curve)
        public
    {
        bytes memory gpk = round.gpk;
        uint x = DataConvert.bytes2uint(polyCommit, 1, 32);
        uint y = DataConvert.bytes2uint(polyCommit, 33, 32);
        if (gpk.length != 0) {
            uint gpkX = DataConvert.bytes2uint(gpk, 1, 32);
            uint gpkY = DataConvert.bytes2uint(gpk, 33, 32);
            bool success;
            (x, y, success) = ICurve(curve).add(x, y, gpkX, gpkY);
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
    /// @param round                      round
    /// @param polyCommit                 poly commit
    /// @param curve                      curve contract address
    function updatePkShare(CreateGpkTypes.Group storage group, CreateGpkTypes.Round storage round, bytes polyCommit, address curve)
        public
    {
        uint x;
        uint y;
        bool success;
        for (uint i = 0; i < group.smNumber; i++) {
            address txAddress = group.indexMap[i];
            bytes memory pk = group.addressMap[txAddress];
            (x, y, success) = ICurve(curve).calPolyCommit(polyCommit, pk);
            require(success == true, "PolyCommit failed");

            bytes memory pkShare = round.srcMap[txAddress].pkShare;
            if (pkShare.length != 0) {
                uint pkX = DataConvert.bytes2uint(pkShare, 1, 32);
                uint pkY = DataConvert.bytes2uint(pkShare, 33, 32);
                (x, y, success) = ICurve(curve).add(x, y, pkX, pkY);
                require(success == true, "Add failed");
            } else {
                pkShare = new bytes(65);
                pkShare[0] = 0x04;
            }
            assembly { mstore(add(pkShare, 33), x) }
            assembly { mstore(add(pkShare, 65), y) }
            round.srcMap[txAddress].pkShare = pkShare;
            if (group.curveNumber == 1) {
                group.roundMap[group.round][group.chainMap[1]].srcMap[txAddress].pkShare = pkShare;
            }
        }
    }

    /// @notice                           function for verify sij to judge challenge
    /// @param d                          Dest
    /// @param destPk                     dest storeman pk
    /// @param polyCommit                 polyCommit of pki
    /// @param curve                      curve contract address
    function verifySij(CreateGpkTypes.Dest storage d, bytes destPk, bytes polyCommit, address curve)
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
    /// @param chain                      chain to use this gpk
    /// @param slashType                  slash reason
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  slash src or dest
    /// @param toReset                    is reset immediately
    function slash(CreateGpkTypes.Group storage group, uint32 chain,
        CreateGpkTypes.SlashType slashType, address src, address dest, bool srcOrDest, bool toReset, address smg)
        public
    {
        emit SlashLogger(group.groupId, group.round, chain, uint8(slashType), src, dest, srcOrDest);
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
    function slashMulti(CreateGpkTypes.Group storage group, uint slashNumber,
        CreateGpkTypes.SlashType[] slashTypes, address[] slashSms, address smg)
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
    function reset(CreateGpkTypes.Group storage group, bool isContinue)
        public
    {
        CreateGpkTypes.Round storage round = group.roundMap[group.round][group.chainMap[0]];
        round.status = CreateGpkTypes.GroupStatus.Close;
        round.statusTime = now;
        round = group.roundMap[group.round][group.chainMap[1]];
        round.status = CreateGpkTypes.GroupStatus.Close;
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