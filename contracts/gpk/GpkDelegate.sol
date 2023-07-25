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

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../components/Admin.sol";
import "./GpkStorage.sol";
import "./lib/GpkLib.sol";

contract GpkDelegate is Admin, GpkStorage {
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

    /**
    *
    * MANIPULATIONS
    *
    */

    function initialize() external initializer {
        owner = msg.sender;
    }

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
    function setPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, bytes memory polyCommit)
        external
    {
        require(polyCommit.length > 0, "Invalid polyCommit");

        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        if (group.smNumber == 0) {
            // init group when the first node submit to start every round
            GpkLib.initGroup(groupId, group, cfg, smg);
        }
        if (round.statusTime == 0) {
            round.statusTime = block.timestamp;
        }
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.PolyCommit, true, false, address(0));
        require(round.srcMap[msg.sender].polyCommit.length == 0, "Duplicate");
        round.srcMap[msg.sender].polyCommit = polyCommit;
        round.polyCommitCount++;
        GpkLib.updateGpk(round, polyCommit);
        GpkLib.updateGpkShare(group, round, polyCommit);
        if (round.polyCommitCount >= group.smNumber) {
            round.status = GpkTypes.GpkStatus.Negotiate;
            round.statusTime = block.timestamp;
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
        require(block.timestamp.sub(round.statusTime) > timeout, "Not late");
        uint slashCount = 0;
        for (uint i = 0; (i < group.smNumber) && (slashCount + round.polyCommitCount < group.smNumber); i++) {
            address src = group.addrMap[i];
            if (round.srcMap[src].polyCommit.length == 0) {
                GpkLib.slash(group, curveIndex, GpkTypes.SlashType.PolyCommitTimeout, src, address(0), false, smg);
                slashCount++;
            }
        }
        GpkLib.slashMulti(group, curveIndex, smg);
    }

    /// @notice                           function for src storeman submit encSij
    /// @param groupId                    storeman group id
    /// @param roundIndex                 group negotiate round
    /// @param curveIndex                 singnature curve index
    /// @param dest                       dest storeman address
    /// @param encSij                     encSij
    function setEncSij(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address dest, bytes memory encSij)
        external
    {
        require(encSij.length > 0, "Invalid encSij"); // ephemPublicKey(65) + iv(16) + mac(32) + ciphertext(48)
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, roundIndex, curveIndex, GpkTypes.GpkStatus.Negotiate, true, true, dest);
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[msg.sender].destMap[dest];
        require(d.encSij.length == 0, "Duplicate");
        d.encSij = encSij;
        d.setTime = block.timestamp;
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

        d.checkTime = block.timestamp;
        emit SetCheckStatusLogger(groupId, roundIndex, curveIndex, src, msg.sender, isValid);

        if (isValid) {
            d.checkStatus = GpkTypes.CheckStatus.Valid;
            s.checkValidCount++;
            round.checkValidCount++;
            if (round.checkValidCount >= group.smNumber ** 2) {
                round.status = GpkTypes.GpkStatus.Complete;
                round.statusTime = block.timestamp;
                GpkLib.tryComplete(group, smg);
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
        require(block.timestamp.sub(round.statusTime) > group.defaultPeriod, "Not late");
        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.EncSijTimout, src, msg.sender, true, smg);
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
        if (GpkLib.verifySij(d, group.pkMap[dest], src.polyCommit, round.curve)) {
          GpkLib.slash(group, curveIndex, GpkTypes.SlashType.CheckInvalid, dest, msg.sender, true, smg);
        } else {
          GpkLib.slash(group, curveIndex, GpkTypes.SlashType.SijInvalid, msg.sender, dest, true, smg);
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
        require(block.timestamp.sub(d.setTime) > group.defaultPeriod, "Not late");
        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.CheckTimeout, dest, msg.sender, true, smg);
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
        require(block.timestamp.sub(d.checkTime) > group.defaultPeriod, "Not late");
        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.SijTimeout, src, msg.sender, true, smg);
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
        require(block.timestamp.sub(round.statusTime) > group.negotiatePeriod, "Not late");
        for (uint i = 0; i < group.smNumber; i++) {
            address src = group.addrMap[i];
            uint slashPair = uint(group.smNumber).sub(uint(round.srcMap[src].checkValidCount));
            for (uint j = 0; (j < group.smNumber) && (slashPair > 0); j++) {
                address dest = group.addrMap[j];
                GpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
                if (d.checkStatus != GpkTypes.CheckStatus.Valid) {
                    if (d.encSij.length == 0) {
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.EncSijTimout, src, dest, false, smg);
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.Connive, dest, src, false, smg);
                    } else if (d.checkStatus == GpkTypes.CheckStatus.Init) {
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.Connive, src, dest, false, smg);
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.CheckTimeout, dest, src, false, smg);
                    } else { // GpkTypes.CheckStatus.Invalid
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.SijTimeout, src, dest, false, smg);
                        GpkLib.slash(group, curveIndex, GpkTypes.SlashType.Connive, dest, src, false, smg);
                    }
                    slashPair--;
                }
            }
        }
        GpkLib.slashMulti(group, curveIndex, smg);
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
        require(curveIndex <= 1, "Invalid curve"); // curve only can be 0 or 1
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        require((round.status == status) && (round.statusTime > 0), "Invalid status");
        if (checkSender) {
            require(group.pkMap[msg.sender].length > 0, "Invalid sender");
        }
        if (checkStoreman) {
            require(group.pkMap[storeman].length > 0, "Invalid storeman");
        }
    }

    function getGroupInfo(bytes32 groupId, uint32 roundIndex)
        external
        view
        returns(uint16 queriedRound, address curve1, uint8 curve1Status, uint curve1StatusTime, address curve2, uint8 curve2Status, uint curve2StatusTime)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        queriedRound = (roundIndex >= 0)? uint16(roundIndex) : group.round;
        GpkTypes.Round storage round1 = group.roundMap[queriedRound][0];
        GpkTypes.Round storage round2 = group.roundMap[queriedRound][1];
        return (queriedRound, round1.curve, uint8(round1.status), round1.statusTime, round2.curve, uint8(round2.status), round2.statusTime);
    }

    function getPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address src)
        external
        view
        returns(bytes memory polyCommit)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        return round.srcMap[src].polyCommit;
    }

    function getSijInfo(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address src, address dest)
        external
        view
        returns(bytes memory encSij, uint8 checkStatus, uint setTime, uint checkTime, uint sij, uint ephemPrivateKey)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        GpkTypes.Dest storage d = round.srcMap[src].destMap[dest];
        return (d.encSij, uint8(d.checkStatus), d.setTime, d.checkTime, d.sij, d.ephemPrivateKey);
    }

    function getGpkShare(bytes32 groupId, uint16 index)
        external
        view
        returns(bytes memory gpkShare1, bytes memory gpkShare2)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        address src = group.addrMap[index];
        mapping(uint8 => GpkTypes.Round) storage roundMap = groupMap[groupId].roundMap[group.round];
        return (roundMap[0].srcMap[src].gpkShare, roundMap[1].srcMap[src].gpkShare);
    }

    function getGpk(bytes32 groupId)
        external
        view
        returns(bytes memory gpk1, bytes memory gpk2)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        mapping(uint8 => GpkTypes.Round) storage roundMap = groupMap[groupId].roundMap[group.round];
        return (roundMap[0].gpk, roundMap[1].gpk);
    }

    /// @notice receive function
    receive () external payable {
        revert("Not support");
    }
}
