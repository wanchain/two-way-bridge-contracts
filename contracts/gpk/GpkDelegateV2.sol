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
pragma experimental ABIEncoderV2;

import "../lib/SafeMath.sol";
import "../components/Admin.sol";
import "./GpkStorageV2.sol";
import "./lib/GpkLibV2.sol";

contract GpkDelegateV2 is GpkStorageV2 {
    using SafeMath for uint;
    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param curveIndex                 signature curve index
    /// @param storeman                   storeman address
    event SetPolyCommitLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address storeman);

    /// @notice                           event for storeman submit encoded sij
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param curveIndex                 signature curve index
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event SetEncSijLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest);

    /// @notice                           event for storeman submit result of checking encSij
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param curveIndex                 signature curve index
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    /// @param isValid                    whether encSij is valid
    event SetCheckStatusLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest, bool isValid);

    /// @notice                           event for storeman reveal sij
    /// @param groupId                    storeman group id
    /// @param round                      group negotiate round
    /// @param curveIndex                 signature curve index
    /// @param src                        src storeman address
    /// @param dest                       dest storeman address
    event RevealSijLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest);


    event GpkCreatedLogger(bytes32 indexed groupId, uint16 indexed round, bytes[] gpk);
    event setGpkCfgEvent(bytes32 indexed groupId, uint indexed count);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                           function for set smg contract address
    /// @param cfgAddr                    cfg contract address
    /// @param smgAddr                    smg contract address
    function setDependence(address cfgAddr, address smgAddr)
        external
        onlyOwner
    {
        require(cfgAddr != address(0), "Invalid cfg");
        cfg = cfgAddr;
              
        require(smgAddr != address(0), "Invalid smg");
        smg = smgAddr;
    }

    /// @notice                           function for set period
    /// @param groupId                    group id
    /// @param ployCommitPeriod           ployCommit period
    /// @param defaultPeriod              default period
    /// @param negotiatePeriod            negotiate period
    function setPeriod(bytes32 groupId, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod)
        external
        onlyAdmin
    {
        GpkTypes.Group storage group = groupMap[groupId];
        group.ployCommitPeriod = ployCommitPeriod;
        group.defaultPeriod = defaultPeriod;
        group.negotiatePeriod = negotiatePeriod;
    }


    /// @notice                           function for storeman submit poly commit
    /// @param groupId                    storeman group id
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param polyCommit                 poly commit list (17 order in x0,y0,x1,y1... format)
    function setPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, bytes polyCommit)
        external
    {
        require(polyCommit.length > 0, "Invalid polyCommit");
        require(gpkCount[groupId] != 0, "Invalid gpk count");

        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        uint[] memory curves = new uint[](gpkCount[groupId]);
        for(uint8 i=0; i<gpkCount[groupId];  i++) {
            curves[i] = curve[groupId][i];
        }

        if (group.smNumber == 0) {
            // init group when the first node submit to start every round
            GpkLibV2.initGroup(groupId, group, cfg, smg, curves);
        }
        if (round.statusTime == 0) {
            round.statusTime = now;
        }
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.PolyCommit, true, false, address(0));
        require(round.srcMap[msg.sender].polyCommit.length == 0, "Duplicate");
        round.srcMap[msg.sender].polyCommit = polyCommit;
        round.polyCommitCount++;
        GpkLibV2.updateGpk(round, polyCommit);
        GpkLibV2.updateGpkShare(group, round, polyCommit);
        if (round.polyCommitCount >= group.smNumber) {
            round.status = GpkTypes.GpkStatus.Negotiate;
            round.statusTime = now;
        }

        emit SetPolyCommitLogger(groupId, roundIndex, curveIndex, msg.sender);
    }

    /// @notice                           function for report storeman submit poly commit timeout
    /// @param groupId                    storeman group id
    /// @param curveIndex                 singnature curve index
    function polyCommitTimeout(bytes32 groupId, uint8 curveIndex)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.PolyCommit, false, false, address(0));
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        uint32 timeout = (group.round == 0) ? group.ployCommitPeriod : group.defaultPeriod;
        require(now.sub(round.statusTime) > timeout, "Not late");
        uint slashCount = 0;
        for (uint i = 0; (i < group.smNumber) && (slashCount + round.polyCommitCount < group.smNumber); i++) {
            address src = group.addrMap[i];
            if (round.srcMap[src].polyCommit.length == 0) {
                GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.PolyCommitTimeout, src, address(0), false, smg);
                slashCount++;
            }
        }
        GpkLibV2.slashMulti(group, curveIndex, smg);
    }

    /// @notice                           function for src storeman submit encSij
    /// @param groupId                    storeman group id
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param dest                       dest storeman address
    /// @param encSij                     encSij
    function setEncSij(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address dest, bytes encSij)
        external
    {
        require(encSij.length > 0, "Invalid encSij"); // ephemPublicKey(65) + iv(16) + mac(32) + ciphertext(48)
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, dest);
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.encSij.length == 0, "Duplicate");
        d.encSij = encSij;
        d.setTime = now;
        emit SetEncSijLogger(groupId, roundIndex, curveIndex, msg.sender, dest);
    }

    /// @notice                           function for dest storeman set check status for encSij
    /// @param groupId                    storeman group id
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param src                        src storeman address
    /// @param isValid                    whether encSij is valid
    function setCheckStatus(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address src, bool isValid)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, src);
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        GpkTypes.Src storage s = round.srcMap[src];
        GpkTypes.Dest storage d = s.destMap[msg.sender];
        require(d.encSij.length != 0, "Not ready");
        require(d.checkStatus == GpkTypes.CheckStatus.Init, "Duplicate");

        d.checkTime = now;
        emit SetCheckStatusLogger(groupId, roundIndex, curveIndex, src, msg.sender, isValid);

        if (isValid) {
            d.checkStatus = GpkTypes.CheckStatus.Valid;
            s.checkValidCount++;
            round.checkValidCount++;
            if (round.checkValidCount >= group.smNumber ** 2) {
                round.status = GpkTypes.GpkStatus.Complete;
                round.statusTime = now;
                tryComplete(groupId, smg);
            }
        } else {
            d.checkStatus = GpkTypes.CheckStatus.Invalid;
        }
    }

    /// @notice                           function for report src storeman submit encSij timeout
    /// @param groupId                    storeman group id
    /// @param curveIndex                 singnature curve index
    /// @param src                        src storeman address
    function encSijTimeout(bytes32 groupId, uint8 curveIndex, address src)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, src);
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.encSij.length == 0, "Outdated");
        require(now.sub(round.statusTime) > group.defaultPeriod, "Not late");
        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.EncSijTimout, src, msg.sender, true, smg);
    }

    /// @notice                           function for src storeman reveal sij
    /// @param groupId                    storeman group id
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param dest                       dest storeman address
    /// @param sij                        sij
    /// @param ephemPrivateKey            ecies ephemPrivateKey
    function revealSij(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address dest, uint sij, uint ephemPrivateKey)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, dest);
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        GpkTypes.Src storage src = round.srcMap[msg.sender];
        GpkTypes.Dest storage d = src.destMap[dest];
        require(d.checkStatus == GpkTypes.CheckStatus.Invalid, "Not need");
        d.sij = sij;
        d.ephemPrivateKey = ephemPrivateKey;
        emit RevealSijLogger(groupId, roundIndex, curveIndex, msg.sender, dest);
        if (GpkLibV2.verifySij(d, group.pkMap[dest], src.polyCommit, round.curve)) {
          GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.CheckInvalid, dest, msg.sender, true, smg);
        } else {
          GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.SijInvalid, msg.sender, dest, true, smg);
        }
    }

    /// @notice                           function for report dest storeman check Sij timeout
    /// @param groupId                    storeman group id
    /// @param curveIndex                 singnature curve index
    /// @param dest                       dest storeman address
    function checkSijTimeout(bytes32 groupId, uint8 curveIndex, address dest)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, dest);
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.checkStatus == GpkTypes.CheckStatus.Init, "Checked");
        require(d.encSij.length != 0, "Not ready");
        require(now.sub(d.setTime) > group.defaultPeriod, "Not late");
        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.CheckTimeout, dest, msg.sender, true, smg);
    }

    /// @notice                           function for report srcPk submit sij timeout
    /// @param groupId                    storeman group id
    /// @param curveIndex                 singnature curve index
    /// @param src                        src storeman address
    function SijTimeout(bytes32 groupId, uint8 curveIndex, address src)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, src);
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[src].destMap[msg.sender];
        require(d.checkStatus == GpkTypes.CheckStatus.Invalid, "Not need");
        require(now.sub(d.checkTime) > group.defaultPeriod, "Not late");
        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.SijTimeout, src, msg.sender, true, smg);
    }

    /// @notice                           function for terminate protocol
    /// @param groupId                    storeman group id
    /// @param curveIndex                 singnature curve index
    function terminate(bytes32 groupId, uint8 curveIndex)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.Negotiate, false, false, address(0));
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        require(now.sub(round.statusTime) > group.negotiatePeriod, "Not late");
        for (uint i = 0; i < group.smNumber; i++) {
            address src = group.addrMap[i];
            uint slashPair = uint(group.smNumber).sub(uint(round.srcMap[src].checkValidCount));
            for (uint j = 0; (j < group.smNumber) && (slashPair > 0); j++) {
                address dest = group.addrMap[j];
                GpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
                if (d.checkStatus != GpkTypes.CheckStatus.Valid) {
                    if (d.encSij.length == 0) {
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.EncSijTimout, src, dest, false, smg);
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.Connive, dest, src, false, smg);
                    } else if (d.checkStatus == GpkTypes.CheckStatus.Init) {
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.Connive, src, dest, false, smg);
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.CheckTimeout, dest, src, false, smg);
                    } else { // GpkTypes.CheckStatus.Invalid
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.SijTimeout, src, dest, false, smg);
                        GpkLibV2.slash(group, curveIndex, GpkTypes.SlashType.Connive, dest, src, false, smg);
                    }
                    slashPair--;
                }
            }
        }
        GpkLibV2.slashMulti(group, curveIndex, smg);
    }

    /// @notice                           function for check paras
    /// @param group                      group
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param status                     check group status
    /// @param checkSender                whether check msg.sender
    /// @param checkStoreman              whether check storeman
    /// @param storeman                   storeman address
    function checkValid(GpkTypes.Group storage group, uint16 roundIndex, uint8 curveIndex, GpkTypes.GpkStatus status, bool checkSender, bool checkStoreman, address storeman)
        private
        view
    {
        require(roundIndex == group.round, "Invalid round"); // must be current round
        require(curveIndex < gpkCount[group.groupId], "Invalid curve"); 
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        require((round.status == status) && (round.statusTime > 0), "Invalid status");
        if (checkSender) {
            require(group.pkMap[msg.sender].length > 0, "Invalid sender");
        }
        if (checkStoreman) {
            require(group.pkMap[storeman].length > 0, "Invalid storeman");
        }
    }

    function getGroupInfobyIndex(bytes32 groupId, int32 roundIndex, uint8 gpkIndex)
        external
        view
        returns(uint16 queriedRound, address curve, uint8 curveStatus, uint curveStatusTime)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        queriedRound = (roundIndex >= 0)? uint16(roundIndex) : group.round;
        GpkTypes.Round storage round = group.roundMap[queriedRound][gpkIndex];
        return (queriedRound, round.curve, uint8(round.status), round.statusTime);
    }

    function getPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 gpkIndex, address src)
        external
        view
        returns(bytes polyCommit)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][gpkIndex];
        return round.srcMap[src].polyCommit;
    }

    function getSijInfo(bytes32 groupId, uint16 roundIndex, uint8 gpkIndex, address src, address dest)
        external
        view
        returns(bytes encSij, uint8 checkStatus, uint setTime, uint checkTime, uint sij, uint ephemPrivateKey)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][gpkIndex];
        GpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
        return (d.encSij, uint8(d.checkStatus), d.setTime, d.checkTime, d.sij, d.ephemPrivateKey);
    }

    function getGpkbyIndex(bytes32 groupId, uint8 gpkIndex)
        external
        view
        returns(bytes gpk)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        mapping(uint8 => GpkTypes.Round) roundMap = groupMap[groupId].roundMap[group.round];
        return roundMap[gpkIndex].gpk;
    }

    function getGpkSharebyIndex(bytes32 groupId, uint16 smIndex, uint8 gpkIndex)
        external
        view
        returns(bytes gpkShare)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        address src = group.addrMap[smIndex];
        mapping(uint8 => GpkTypes.Round) roundMap = groupMap[groupId].roundMap[group.round];
        return roundMap[gpkIndex].srcMap[src].gpkShare;
    }
    function getGroupInfobyRoundCurve(bytes32 groupId, int32 roundIndex, uint8 gpkIndex)
        external
        view
        returns(uint16 queriedRound, address curve, uint8 curveStatus, uint curveStatusTime)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        queriedRound = (roundIndex >= 0)? uint16(roundIndex) : group.round;
        GpkTypes.Round storage round = group.roundMap[queriedRound][gpkIndex];
        return (queriedRound, round.curve, uint8(round.status), round.statusTime);
    }
    // function getGpkCount(bytes32 groupId) public view returns(uint count) {
    //     return gpkCount[groupId];
    // }
    // function getGpkCfgbyGroup(bytes32 groupId, uint index) external view  returns(uint curveIndex, uint algo) {
    //     return(curve[groupId][index], algo[groupId][index]);
    // }

    function setGpkCfg(bytes32 groupId, uint[] curIndex, uint[] algoIndex) external onlyAdmin {
        require(curIndex.length != 0, "empty curve");
        require(curIndex.length == algoIndex.length, "invalid length");
        gpkCount[groupId] = curIndex.length;
        for(uint i=0; i<gpkCount[groupId]; i++) {
            algo[groupId][i] = algoIndex[i];
            curve[groupId][i] = curIndex[i];
        }
        emit setGpkCfgEvent(groupId, gpkCount[groupId]);
    }


    function tryComplete(bytes32 groupId, address smg)
        public
    {
        GpkTypes.Group storage group = groupMap[groupId];
        uint8 i;
        for(i=0; i<gpkCount[groupId]; i++) {
            if(group.roundMap[group.round][i].status != GpkTypes.GpkStatus.Complete) {
                return;
            }
        }

        bytes[] memory gpks = new  bytes[](gpkCount[groupId]);
        
        for(i=0; i<gpkCount[groupId]; i++) { 
            gpks[i] = group.roundMap[group.round][i].gpk;
        }
        emit GpkCreatedLogger(groupId, group.round, gpks );
        GpkTypes.Round storage round1 = group.roundMap[group.round][0];
        GpkTypes.Round storage round2 = group.roundMap[group.round][1];
        IStoremanGroup(smg).setGpk(groupId, round1.gpk, round2.gpk); // only set 2 gpk for compatible 
    }
}

