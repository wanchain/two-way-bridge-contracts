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

    /// @notice                           event for gpk created
    /// @param groupId                    storeman group id
    /// @param gpk1                       group public key for chain1
    /// @param gpk2                       group public key for chain2
    event GpkCreatedLogger(bytes32 indexed groupId, bytes gpk1, bytes gpk2);

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
        curveMap[curveId] = curveAddress;
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
            initGroup(groupId);
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
                slash(groupId, chain, CreateGpkTypes.SlashType.PolyCommitTimeout, src, address(0), true, false);
                slashTypes[slashCount] = CreateGpkTypes.SlashType.PolyCommitTimeout;
                slashSms[slashCount] = src;
                slashCount++;
            }
        }
        slashMulti(groupId, slashCount, slashTypes, slashSms);
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
                tryComplete(groupId);
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
        slash(groupId, chain, CreateGpkTypes.SlashType.EncSijTimout, src, msg.sender, true, true);
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
          slash(groupId, chain, CreateGpkTypes.SlashType.CheckInvalid, msg.sender, dest, false, true);
        } else {
          slash(groupId, chain, CreateGpkTypes.SlashType.EncSijInvalid, msg.sender, dest, true, true);
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
        slash(groupId, chain, CreateGpkTypes.SlashType.CheckTimeout, msg.sender, dest, false, true);
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
        slash(groupId, chain, CreateGpkTypes.SlashType.SijTimeout, src, msg.sender, true, true);
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
                slash(groupId, chain, sType, src, dest, true, false);
                slash(groupId, chain, dType, src, dest, false, false);
                slashTypes[slashCount] = sType;
                slashSms[slashCount] = src;
                slashCount++;
                slashTypes[slashCount] = dType;
                slashSms[slashCount] = dest;
                slashCount++;
            }
        }
        slashMulti(groupId, slashCount, slashTypes, slashSms);
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

    /// @notice                           function for init period
    /// @param groupId                    storeman group id
    function initGroup(bytes32 groupId)
        internal
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];

        // init period
        if (group.defaultPeriod == 0) { // once per group
            group.ployCommitPeriod = 10 * 60;
            group.defaultPeriod = 5 * 60;
            group.negotiatePeriod = 15 * 60;
        }

        // init chain
        if (group.curveNumber == 0) {
            uint32 chain1;
            uint8 curve1;
            uint32 chain2;
            uint8 curve2;
            (chain1, curve1, chain2, curve2) = smg.getChainCurve(groupId);
            require(curveMap[curve1] != address(0), "No curve");
            require(curveMap[curve2] != address(0), "No curve");
            group.chainMap[0] = chain1;
            group.chainMap[1] = chain2;
            group.chainCurveMap[chain1] = curveMap[curve1];
            group.chainCurveMap[chain2] = curveMap[curve2];
            if (curve1 == curve2) {
                group.curveNumber = 1;
                group.roundMap[group.round][group.chainMap[1]].status = CreateGpkTypes.GroupStatus.Complete;
            } else {
                group.curveNumber = 2;
            }
        }

        // selected sm list
        group.smNumber = uint16(smg.getSelectedSmNumber(groupId));
        require(group.smNumber > 0, "Invalid number");
        // retrieve nodes
        address txAddress;
        bytes memory pk;
        for (uint i = 0; i < group.smNumber; i++) {
            (txAddress, pk,) = smg.getSelectedSmInfo(groupId, i);
            group.indexMap[i] = txAddress;
            group.addressMap[txAddress] = CreateGpkLib.unifyPk(pk);
        }
    }

    /// @notice                           function for try to complete
    /// @param groupId                    storeman group id
    function tryComplete(bytes32 groupId)
        internal
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        CreateGpkTypes.Round storage round1 = group.roundMap[group.round][group.chainMap[0]];
        CreateGpkTypes.Round storage round2 = group.roundMap[group.round][group.chainMap[1]];
        if (group.curveNumber == 1) {
            round2.gpk = round1.gpk;
        }
        if (round1.status == round2.status) {
            smg.setGpk(groupId, round1.gpk, round2.gpk);
            emit GpkCreatedLogger(groupId, round1.gpk, round2.gpk);
        }
    }

    /// @notice                           function for slash
    /// @param groupId                    storeman group id
    /// @param chain                      chain to use this gpk
    /// @param slashType                  slash reason
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param srcOrDest                  slash src or dest
    /// @param toReset                    is reset immediately
    function slash(bytes32 groupId, uint32 chain, CreateGpkTypes.SlashType slashType, address src, address dest, bool srcOrDest, bool toReset)
        internal
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
        emit SlashLogger(groupId, group.round, chain, uint8(slashType), src, dest, srcOrDest);
        if (toReset) {
            uint[] memory types = new uint[](1);
            types[0] = uint(slashType);
            address[] memory sms = new address[](1);
            sms[0] = srcOrDest? src : dest;
            bool isContinue = smg.setInvalidSm(groupId, types, sms);
            reset(groupId, isContinue);
        }
    }

    /// @notice                           function for slash
    /// @param groupId                    storeman group id
    /// @param slashNumber                slash number of storemans
    /// @param slashTypes                 slash types
    /// @param slashSms                   slash storeman address
    function slashMulti(bytes32 groupId, uint slashNumber, CreateGpkTypes.SlashType[] slashTypes, address[] slashSms)
        internal
    {
        require(slashNumber > 0, "Not slash");
        uint[] memory types = new uint[](slashNumber);
        address[] memory sms = new address[](slashNumber);
        for (uint i = 0; i < slashNumber; i++) {
          types[i] = uint(slashTypes[i]);
          sms[i] = slashSms[i];
        }
        bool isContinue = smg.setInvalidSm(groupId, types, sms);
        reset(groupId, isContinue);
    }

    /// @notice                           function for reset protocol
    /// @param groupId                    storeman group id
    /// @param isContinue                 is continue to next round
    function reset(bytes32 groupId, bool isContinue)
        internal
    {
        CreateGpkTypes.Group storage group = groupMap[groupId];
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

        emit ResetLogger(groupId, group.round);
        if (isContinue) {
          group.round++;
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