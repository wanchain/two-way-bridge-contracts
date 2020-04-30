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

import "../lib/SafeMath.sol";
import "../lib/Secp256k1.sol";
import "../components/Halt.sol";
import "./CreateGpkStorage.sol";

contract CreateGpkDelegate is CreateGpkStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for start create gpk for specified storeman group
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    event StartCreateGpkLogger(bytes32 indexed groupId, uint indexed round);

    /// @notice                           event for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param storeman                   storeman address
    event SetPolyCommitLogger(bytes32 indexed groupId, uint indexed round, address storeman);

    /// @notice                           event for storeman submit encoded Sij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event SetEncSijLogger(bytes32 indexed groupId, uint indexed round, address src, address dest);

    /// @notice                           event for storeman submit result of checking encSij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param isValid                    whether encSij is valid
    event SetCheckStatusLogger(bytes32 indexed groupId, uint indexed round, address src, address dest, bool isValid);

    /// @notice                           event for storeman reveal Sij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event RevealSijLogger(bytes32 indexed groupId, uint indexed round, address src, address dest);

    /// @notice                           event for contract slash storeman
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param slashType                  the reason to slash
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  if true, slash src, otherwise slash dest
    event SlashLogger(bytes32 indexed groupId, uint indexed round, uint slashType, address src, address dest, bool srcOrDest);

    /// @notice                           event for reset protocol
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    event ResetLogger(bytes32 indexed groupId, uint indexed round);

    /// @notice                           event for reset protocol
    /// @param groupId                    storeman group id
    /// @param gpk                        group public key
    event GpkCreatedLogger(bytes32 indexed groupId, bytes gpk);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for set config and mortgage contract address
    /// @param configAddr                 config contract address
    /// @param mortgageAddr               mortgage contract address
    function setDependence(address configAddr, address mortgageAddr)
        external
        onlyOwner
    {
        require(configAddr != address(0), "Invalid config address");
        require(mortgageAddr != address(0), "Invalid mortgage address");
        config = IConfig(configAddr);
        mortgage = IMortgage(mortgageAddr);
    }

    /// @notice                           function for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param polyCommit                 poly commit list (17 order in x0,y0,x1,y1... format)
    function setPolyCommit(bytes32 groupId, bytes polyCommit)
        external
    {
        require(polyCommit.length > 0, "Invalid polyCommit");

        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        if (round.status == GroupStatus.Init) {
            require(round.pkNumber == 0, "Invalid status");
            // init config
            if (group.cfg.ployCommitPeriod == 0) {
               fetchConfig(groupId);
            }
            // selected sm list
            round.pkNumber = mortgage.getSelectedSmNumber(groupId);
            require(round.pkNumber > 0, "Invalid sm number");
            bytes memory pk;
            address txAddress;
            for (uint i = 0; i < round.pkNumber; i++) {
                (pk, txAddress) = mortgage.getSelectedSmInfo(groupId, i);
                round.indexMap[i] = txAddress;
                round.addressMap[txAddress] = pk;
            }
            round.status = GroupStatus.PolyCommit;
            round.statusTime = now;
            emit StartCreateGpkLogger(groupId, group.round);
        }

        require(round.status == GroupStatus.PolyCommit, "Invalid status");
        require(round.addressMap[msg.sender].length != 0, "Invalid sender");
        require(round.srcMap[msg.sender].polyCommit.length == 0, "Duplicate");
        round.srcMap[msg.sender] = Src(polyCommit, new bytes(0));
        round.polyCommitCount++;
        if (round.polyCommitCount >= round.pkNumber) {
            round.status = GroupStatus.Gpk;
            round.statusTime = now;
        }

        emit SetPolyCommitLogger(groupId, group.round, msg.sender);
    }

    /// @notice                           function for report storeman submit poly commit timeout
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    function polyCommitTimeout(bytes32 groupId, address src)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.PolyCommit, src, false);
        require(now.sub(round.statusTime) > group.cfg.ployCommitPeriod, "Deadline not reached");
        require(round.srcMap[src].polyCommit.length == 0, "Submitted");
        slash(groupId, SlashType.PolyCommitTimeout, src, address(0), true);
    }

    /// @notice                           function for storeman submit gpk and pkShare (only for poc)
    /// @param groupId                    storeman group id
    /// @param gpk                        gpk, only accept leader's value
    /// @param pkShare                    storeman group pkShare
    function setGpk(bytes32 groupId, bytes gpk, bytes pkShare)
        external
    {
        require(gpk.length == 65, "Invalid gpk");
        require(pkShare.length == 65, "Invalid pkShare");

        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Gpk, address(0), true);
        Src storage src = round.srcMap[msg.sender];
        require(src.pkShare.length == 0, "Invalid pkShare");
        src.pkShare = pkShare;
        round.gpkCount++;
        if (round.gpkCount >= round.pkNumber) {
            round.gpk = gpk;
            round.status = GroupStatus.Negotiate;
            round.statusTime = now;
        }
    }

    /// @notice                           function for report pk submit poly commit timeout
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    function GpkTimeout(bytes32 groupId, address src)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Gpk, src, false);
        require(now.sub(round.statusTime) > group.cfg.defaultPeriod, "Deadline not reached");
        require(round.srcMap[src].pkShare.length == 0, "Submitted");
        slash(groupId, SlashType.PolyCommitTimeout, src, address(0), true);
    }

    /// @notice                           function for src storeman submit encSij
    /// @param groupId                    storeman group id
    /// @param dest                       dest storeman address
    /// @param encSij                     encSij
    function setEncSij(bytes32 groupId, address dest, bytes encSij)
        external
    {
        require(encSij.length == (2 * 64), "Invalid encSij");
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, dest, true);
        Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.encSij.length == 0, "Duplicate");
        d.encSij = encSij;
        d.setTime = now;
        emit SetEncSijLogger(groupId, group.round, msg.sender, dest);
    }

    /// @notice                           function for dest storeman set check status for encSij
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    /// @param isValid                    whether encSij is valid
    function setCheckStatus(bytes32 groupId, address src, bool isValid)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, src, true);
        Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.encSij.length != 0, "Not ready");
        require(d.checkStatus == CheckStatus.Init, "Duplicate");

        d.checkTime = now;
        emit SetCheckStatusLogger(groupId, group.round, src, msg.sender, isValid);

        if (isValid) {
            d.checkStatus = CheckStatus.Valid;
            round.checkValidCount++;
            if (round.checkValidCount >= round.pkNumber ** 2) {
                round.status = GroupStatus.Complete;
                round.statusTime = now;
                mortgage.setGpk(groupId, round.gpk);
                emit GpkCreatedLogger(groupId, round.gpk);
            }
        } else {
            d.checkStatus = CheckStatus.Invalid;
        }
    }

    /// @notice                           function for report src storeman submit encSij timeout
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    function encSijTimeout(bytes32 groupId, address src)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, src, true);
        Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.encSij.length == 0, "Outdated");
        require(now.sub(round.statusTime) > group.cfg.defaultPeriod, "Deadline not reached");
        slash(groupId, SlashType.EncSijTimout, src, msg.sender, true);
    }

    /// @notice                           function for src storeman reveal Sij
    /// @param groupId                    storeman group id
    /// @param dest                       dest storeman address
    /// @param Sij                        Sij
    /// @param r                          random number
    function revealSij(bytes32 groupId, address dest, uint Sij, uint r)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, dest, true);
        Src storage src = round.srcMap[msg.sender];
        Dest storage d = src.destMap[dest];
        require(d.checkStatus == CheckStatus.Invalid, "Invalid checkStatus");
        d.Sij = Sij;
        d.r = r;
        emit RevealSijLogger(groupId, group.round, msg.sender, dest);

        // if (verifySij(Sij, r, d.encSij, src.polyCommit, dest)) {
        //   slash(groupId, SlashType.CheckInvalid, msg.sender, dest, false);
        // } else {
        //   slash(groupId, SlashType.EncSijInvalid, msg.sender, dest, true);
        // }
    }

    /// @notice                           function for report dest storeman check encSij timeout
    /// @param groupId                    storeman group id
    /// @param dest                       dest storeman address
    function checkEncSijTimeout(bytes32 groupId, address dest)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, dest, true);
        Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.checkStatus == CheckStatus.Init, "Invalid checkStatus");
        require(d.encSij.length != 0, "Not ready");
        require(now.sub(d.setTime) > group.cfg.defaultPeriod, "Deadline not reached");
        slash(groupId, SlashType.CheckTimeout, msg.sender, dest, false);
    }

    /// @notice                           function for report srcPk submit Sij timeout
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    function SijTimeout(bytes32 groupId, address src)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, src, false);
        Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.checkStatus == CheckStatus.Invalid, "Invalid checkStatus");
        require(now.sub(d.checkTime) > group.cfg.defaultPeriod, "Deadline not reached");
        slash(groupId, SlashType.SijTimeout, src, msg.sender, true);
    }

    /// @notice                           function for terminate protocol
    /// @param groupId                    storeman group id
    function terminate(bytes32 groupId)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        require(round.status == GroupStatus.Negotiate, "Invalid status");
        require(now.sub(round.statusTime) > group.cfg.negotiatePeriod, "Deadline not reached");

        for (uint i = 0; i < round.pkNumber; i++) {
            Src storage src = round.srcMap[round.indexMap[i]];
            for (uint j = 0; j < round.pkNumber; j++) {
                Dest storage d = src.destMap[round.indexMap[j]];
                if (d.checkStatus == CheckStatus.Valid) {
                    continue;
                }
                if (d.encSij.length == 0) {
                    slash(groupId, SlashType.EncSijTimout, round.indexMap[i], round.indexMap[j], true);
                } else if (d.checkStatus == CheckStatus.Init) {
                    slash(groupId, SlashType.CheckTimeout, round.indexMap[i], round.indexMap[j], false);
                } else if (d.checkStatus == CheckStatus.Invalid) {
                    slash(groupId, SlashType.SijTimeout, round.indexMap[i], round.indexMap[j], true);
                }
                return;
            }
        }
    }

    /// @notice                           function for check paras
    /// @param round                      group round
    /// @param status                     check group status
    /// @param storeman                   check storeman address if not address(0)
    /// @param checkSender                whether check msg.sender
    function checkValid(Round storage round, GroupStatus status, address storeman, bool checkSender)
        internal
        view
    {
        require(round.status == status, "Invalid status");
        if (storeman != address(0)) {
            require(round.addressMap[storeman].length > 0, "Invalid storeman");
        }
        if (checkSender) {
            require(round.addressMap[msg.sender].length > 0, "Invalid sender");
        }
    }

    /// @notice                           function for fetch config
    /// @param groupId                    storeman group id
    function fetchConfig(bytes32 groupId)
        internal
    {
        Config storage cfg = groupMap[groupId].cfg;
        // (cfg.ployCommitPeriod, cfg.defaultPeriod, cfg.encSijMaxTimes, cfg.negotiatePeriod) = config.getCreateGpkCfg();
        cfg.ployCommitPeriod = 10 * 60;
        cfg.defaultPeriod = 5 * 60;
        cfg.negotiatePeriod = 15 * 60;
    }

    // /// @notice                           function for verify Sij to judge challenge
    // /// @param Sij                        Sij
    // /// @param r                          random number
    // /// @param encSij                     encoded Sij
    // /// @param polyCommit                 polyCommit of pki
    // /// @param dest                       dest storeman address
    // function verifySij(uint Sij, r, bytes encSij, bytes polyCommit, address dest)
    //     internal
    //     returns(bool valid)
    // {
    //     return true;
    // }

    /// @notice                           function for verify Sij to judge challenge (only for poc)
    /// @param groupId                    storeman group id
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param isValid                    is Sij valid
    function verifySij(bytes32 groupId, address src, address dest, bool isValid)
        external
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        checkValid(round, GroupStatus.Negotiate, src, true);
        if (isValid) {
            slash(groupId, SlashType.CheckInvalid, src, dest, false);
        } else {
            slash(groupId, SlashType.EncSijInvalid, src, dest, true);
        }
    }

    /// @notice                           function for slash
    /// @param groupId                    storeman group id
    /// @param slashType                  slash reason
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  slash src or dest
    function slash(bytes32 groupId, SlashType slashType, address src, address dest, bool srcOrDest)
        internal
    {
        Group storage group = groupMap[groupId];
        emit SlashLogger(groupId, group.round, uint(slashType), src, dest, srcOrDest);
        mortgage.setInvalidSm(groupId, uint(slashType), srcOrDest? src : dest);
        reset(groupId);
    }

    /// @notice                           function for reset protocol
    /// @param groupId                    storeman group id
    function reset(bytes32 groupId)
        internal
    {
        Group storage group = groupMap[groupId];
        Round storage round = group.roundMap[group.round];
        round.status = GroupStatus.Close;
        round.statusTime = now;
        emit ResetLogger(groupId, group.round);
        group.round++;
    }

    function getGroupInfo(bytes32 groupId, int roundNum)
        external
        view
        returns(uint, uint, uint, uint, uint, uint)
    {
        Group storage group = groupMap[groupId];
        uint queryRound = (roundNum > 0)? uint(roundNum) : group.round;
        Round storage round = group.roundMap[queryRound];
        return (uint(round.status), round.statusTime, queryRound,
                group.cfg.ployCommitPeriod, group.cfg.defaultPeriod, group.cfg.negotiatePeriod);
    }

    function getPolyCommit(bytes32 groupId, address src, int roundNum)
        external
        view
        returns(bytes)
    {
        Group storage group = groupMap[groupId];
        uint queryRound = (roundNum > 0)? uint(roundNum) : group.round;
        Round storage round = group.roundMap[queryRound];
        return round.srcMap[src].polyCommit;
    }

    function getEncSijInfo(bytes32 groupId, address src, address dest, int roundNum)
        external
        view
        returns(bytes, uint, uint, uint, uint, uint)
    {
        Group storage group = groupMap[groupId];
        uint queryRound = (roundNum > 0)? uint(roundNum) : group.round;
        Round storage round = group.roundMap[queryRound];
        Dest storage d = round.srcMap[src].destMap[dest];
        return (d.encSij, uint(d.checkStatus), d.setTime, d.checkTime, d.Sij, d.r);
    }

    /// @notice fallback function
    function () public payable {
        revert("Not support");
    }
}