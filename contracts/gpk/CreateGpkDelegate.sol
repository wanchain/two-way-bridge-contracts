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
import "../components/Owned.sol";
import "./CreateGpkStorage.sol";
import "./lib/CreateGpkLib.sol";

contract CreateGpkDelegate is CreateGpkStorage, Owned {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param chain                      chain to use the gpk
    /// @param storeman                   storeman address
    event SetPolyCommitLogger(bytes32 indexed groupId, uint16 indexed round, uint32 chain, address storeman);

    /// @notice                           event for storeman submit encoded sij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param chain                      chain to use this gpk
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event SetEncSijLogger(bytes32 indexed groupId, uint16 indexed round, uint32 chain, address src, address dest);

    /// @notice                           event for storeman submit result of checking encSij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param chain                      chain to use this gpk
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param isValid                    whether encSij is valid
    event SetCheckStatusLogger(bytes32 indexed groupId, uint16 indexed round, uint32 chain, address src, address dest, bool isValid);

    /// @notice                           event for storeman reveal sij
    /// @param groupId                    storeman group id
    /// @param round                      group reset times
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event RevealSijLogger(bytes32 indexed groupId, uint16 indexed round, address src, address dest);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for set smg contract address
    /// @param smgAddr                    smg contract address
    function setDependence(address smgAddr)
        external
        onlyOwner
    {
        require(smgAddr != address(0), "Invalid smg");
        smg = IStoremanGroup(smgAddr);
    }

    /// @notice                           function for set period
    /// @param groupId                    group id
    /// @param ployCommitPeriod           ployCommit period
    /// @param defaultPeriod              default period
    /// @param negotiatePeriod            negotiate period
    function setPeriod(bytes32 groupId, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod)
        external
        onlyOwner
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        group.ployCommitPeriod = ployCommitPeriod;
        group.defaultPeriod = defaultPeriod;
        group.negotiatePeriod = negotiatePeriod;
    }

    /// @notice                           function for set smg contract address
    /// @param curveId                    curve id
    /// @param curveAddress               curve contract address
    function setCurve(uint8 curveId, address curveAddress)
        external
        onlyOwner
    {
        curves.curveMap[curveId] = curveAddress;
    }

    /// @notice                           function for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param polyCommit                 poly commit list (17 order in x0,y0,x1,y1... format)
    function setPolyCommit(bytes32 groupId, uint32 chain, bytes polyCommit)
        external
    {
        require(polyCommit.length > 0, "Invalid polyCommit");

        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        require(round.status == CreateGpkTypes.GroupStatus.PolyCommit, "Invalid status");
        if (group.smNumber == 0) {
            // init group when the first node submit
            CreateGpkLib.initGroup(groupId, group, curves, smg);
            round.statusTime = now;
        }
        require(group.addressMap[msg.sender].length != 0, "Invalid sender");
        require(round.srcMap[msg.sender].polyCommit.length == 0, "Duplicate");
        round.srcMap[msg.sender].polyCommit = polyCommit;
        round.polyCommitCount++;
        CreateGpkLib.updateGpk(round, polyCommit, group.chainCurveMap[chain]);
        CreateGpkLib.updatePkShare(group, round, polyCommit, group.chainCurveMap[chain]);
        if (round.polyCommitCount >= group.smNumber) {
            round.status = CreateGpkTypes.GroupStatus.Negotiate;
            round.statusTime = now;
        }

        emit SetPolyCommitLogger(groupId, group.round, chain, msg.sender);
    }

    /// @notice                           function for report storeman submit poly commit timeout
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    function polyCommitTimeout(bytes32 groupId, uint32 chain)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        require((round.status == CreateGpkTypes.GroupStatus.PolyCommit) && (round.statusTime != 0), "Invalid status");
        require(now.sub(round.statusTime) > group.ployCommitPeriod, "Not late");
        uint slashCount = 0;
        CreateGpkTypes.SlashType[] memory slashTypes = new CreateGpkTypes.SlashType[](group.smNumber);
        address[] memory slashSms = new address[](group.smNumber);
        for (uint i = 0; i < group.smNumber; i++) {
            address src = group.indexMap[i];
            if (round.srcMap[src].polyCommit.length == 0) {
                CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.PolyCommitTimeout, src, address(0), true, false, smg);
                slashTypes[slashCount] = CreateGpkTypes.SlashType.PolyCommitTimeout;
                slashSms[slashCount] = src;
                slashCount++;
            }
        }
        CreateGpkLib.slashMulti(group, slashCount, slashTypes, slashSms, smg);
    }

    /// @notice                           function for src storeman submit encSij
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param dest                       dest storeman address
    /// @param encSij                     encSij
    function setEncSij(bytes32 groupId, uint32 chain, address dest, bytes encSij)
        external
    {
        require(encSij.length > 0, "Invalid encSij");
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, dest, true);
        CreateGpkTypes.Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.encSij.length == 0, "Duplicate");
        d.encSij = encSij;
        d.setTime = now;
        emit SetEncSijLogger(groupId, group.round, chain, msg.sender, dest);
    }

    /// @notice                           function for dest storeman set check status for encSij
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param src                        src storeman address
    /// @param isValid                    whether encSij is valid
    function setCheckStatus(bytes32 groupId, uint32 chain, address src, bool isValid)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, src, true);
        CreateGpkTypes.Src storage s = round.srcMap[src];
        CreateGpkTypes.Dest storage d = s.destMap[msg.sender];
        require(d.encSij.length != 0, "Not ready");
        require(d.checkStatus == CreateGpkTypes.CheckStatus.Init, "Duplicate");

        d.checkTime = now;
        emit SetCheckStatusLogger(groupId, group.round, chain, src, msg.sender, isValid);

        if (isValid) {
            d.checkStatus = CreateGpkTypes.CheckStatus.Valid;
            round.checkValidCount++;
            if (round.checkValidCount >= group.smNumber ** 2) {
                round.status = CreateGpkTypes.GroupStatus.Complete;
                round.statusTime = now;
                CreateGpkLib.tryComplete(group, smg);
            }
        } else {
            d.checkStatus = CreateGpkTypes.CheckStatus.Invalid;
        }
    }

    /// @notice                           function for report src storeman submit encSij timeout
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param src                        src storeman address
    function encSijTimeout(bytes32 groupId, uint32 chain, address src)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, src, true);
        CreateGpkTypes.Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.encSij.length == 0, "Outdated");
        require(now.sub(round.statusTime) > group.defaultPeriod, "Not late");
        CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.EncSijTimout, src, msg.sender, true, true, smg);
    }

    /// @notice                           function for src storeman reveal sij
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param dest                       dest storeman address
    /// @param sij                        sij
    /// @param ephemPrivateKey            ecies ephemPrivateKey
    function revealSij(bytes32 groupId, uint32 chain, address dest, uint sij, uint ephemPrivateKey)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, dest, true);
        CreateGpkTypes.Src storage src = round.srcMap[msg.sender];
        CreateGpkTypes.Dest storage d = src.destMap[dest];
        require(d.checkStatus == CreateGpkTypes.CheckStatus.Invalid, "Checked Valid");
        d.sij = sij;
        d.ephemPrivateKey = ephemPrivateKey;
        emit RevealSijLogger(groupId, group.round, msg.sender, dest);
        if (CreateGpkLib.verifySij(d, group.addressMap[dest], src.polyCommit, group.chainCurveMap[chain])) {
          CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.CheckInvalid, msg.sender, dest, false, true, smg);
        } else {
          CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.EncSijInvalid, msg.sender, dest, true, true, smg);
        }
    }

    /// @notice                           function for report dest storeman check encSij timeout
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param dest                       dest storeman address
    function checkEncSijTimeout(bytes32 groupId, uint32 chain, address dest)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, dest, true);
        CreateGpkTypes.Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.checkStatus == CreateGpkTypes.CheckStatus.Init, "Checked");
        require(d.encSij.length != 0, "Not ready");
        require(now.sub(d.setTime) > group.defaultPeriod, "Not late");
        CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.CheckTimeout, msg.sender, dest, false, true, smg);
    }

    /// @notice                           function for report srcPk submit sij timeout
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    /// @param src                        src storeman address
    function SijTimeout(bytes32 groupId, uint32 chain, address src)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        checkValid(group, chain, CreateGpkTypes.GroupStatus.Negotiate, src, true);
        CreateGpkTypes.Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.checkStatus == CreateGpkTypes.CheckStatus.Invalid, "Not need");
        require(now.sub(d.checkTime) > group.defaultPeriod, "Not late");
        CreateGpkLib.slash(group, chain, CreateGpkTypes.SlashType.SijTimeout, src, msg.sender, true, true, smg);
    }

    /// @notice                           function for terminate protocol
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use the gpk
    function terminate(bytes32 groupId, uint32 chain)
        external
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        uint slashCount = 0;
        CreateGpkTypes.SlashType[] memory slashTypes = new CreateGpkTypes.SlashType[](group.smNumber * 2);
        address[] memory slashSms = new address[](group.smNumber * 2);

        require(round.status == CreateGpkTypes.GroupStatus.Negotiate, "Invalid status");
        require(now.sub(round.statusTime) > group.negotiatePeriod, "Not late");

        for (uint i = 0; i < group.smNumber; i++) {
            address src = group.indexMap[i];
            for (uint j = 0; j < group.smNumber; j++) {
                address dest = group.indexMap[j];
                CreateGpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
                if (d.checkStatus == CreateGpkTypes.CheckStatus.Valid) {
                    continue;
                }
                CreateGpkTypes.SlashType sType;
                CreateGpkTypes.SlashType dType;
                if (d.encSij.length == 0) {
                    sType = CreateGpkTypes.SlashType.EncSijTimout;
                    dType = CreateGpkTypes.SlashType.Connive;
                } else if (d.checkStatus == CreateGpkTypes.CheckStatus.Init) {
                    sType = CreateGpkTypes.SlashType.Connive;
                    dType = CreateGpkTypes.SlashType.CheckTimeout;
                } else if (d.checkStatus == CreateGpkTypes.CheckStatus.Invalid) {
                    sType = CreateGpkTypes.SlashType.SijTimeout;
                    dType = CreateGpkTypes.SlashType.Connive;
                }
                CreateGpkLib.slash(group, chain, sType, src, dest, true, false, smg);
                CreateGpkLib.slash(group, chain, dType, src, dest, false, false, smg);
                slashTypes[slashCount] = sType;
                slashSms[slashCount] = src;
                slashCount++;
                slashTypes[slashCount] = dType;
                slashSms[slashCount] = dest;
                slashCount++;
            }
        }
        CreateGpkLib.slashMulti(group, slashCount, slashTypes, slashSms, smg);
    }

    /// @notice                           function for check paras
    /// @param group                      group
    /// @param chain                      chain to use the gpk
    /// @param status                     check group status
    /// @param storeman                   check storeman address if not address(0)
    /// @param checkSender                whether check msg.sender
    function checkValid(CreateGpkTypes.Group storage group, uint32 chain, CreateGpkTypes.GroupStatus status, address storeman, bool checkSender)
        internal
        view
    {
        CreateGpkTypes.Round storage round = group.roundMap[group.round][chain];
        require(group.chainCurveMap[chain] != address(0), "Invalid chain");
        require(round.status == status, "Invalid status");
        if (storeman != address(0)) {
            require(group.addressMap[storeman].length > 0, "Invalid storeman");
        }
        if (checkSender) {
            require(group.addressMap[msg.sender].length > 0, "Invalid sender");
        }
    }

    function getRoundInfo(bytes32 groupId, int16 roundNum, uint32 chain)
        external
        view
        returns(uint16 queriedRound, uint8 status, uint statusTime, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod)
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        uint16 queryRound = (roundNum >= 0)? uint16(roundNum) : group.round;
        CreateGpkTypes.Round storage round = group.roundMap[queryRound][chain];
        return (queryRound, uint8(round.status), round.statusTime,
                group.ployCommitPeriod, group.defaultPeriod, group.negotiatePeriod);
    }

    function getPolyCommit(bytes32 groupId, uint16 roundNum, uint32 chain, address src)
        external
        view
        returns(bytes polyCommit)
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[roundNum][chain];
        return round.srcMap[src].polyCommit;
    }

    function getEncSijInfo(bytes32 groupId, uint16 roundNum, uint32 chain, address src, address dest)
        external
        view
        returns(bytes encSij, uint8 checkStatus, uint setTime, uint checkTime, uint sij, uint ephemPrivateKey)
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round = group.roundMap[roundNum][chain];
        CreateGpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
        return (d.encSij, uint8(d.checkStatus), d.setTime, d.checkTime, d.sij, d.ephemPrivateKey);
    }

    function getPkShare(bytes32 groupId, uint16 index)
        external
        view
        returns(bytes pkShare1, bytes pkShare2)
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        address src = group.indexMap[index];
        mapping(uint32 => CreateGpkTypes.Round) chainRoundMap = groupMap[groupId].roundMap[group.round];
        return (chainRoundMap[group.chainMap[0]].srcMap[src].pkShare, chainRoundMap[group.chainMap[1]].srcMap[src].pkShare);
    }

    function getGpk(bytes32 groupId)
        external
        view
        returns(bytes gpk1, bytes gpk2)
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        mapping(uint32 => CreateGpkTypes.Round) chainRoundMap = groupMap[groupId].roundMap[group.round];
        return (chainRoundMap[group.chainMap[0]].gpk, chainRoundMap[group.chainMap[1]].gpk);
    }

    /// @notice fallback function
    function () public payable {
        revert("Not support");
    }
}