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

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../components/Admin.sol";
import "./GpkStorageV2.sol";
import "../interfaces/IStoremanGroup.sol";
import "./lib/GpkLib.sol" ;

/**
 * @title GpkDelegate
 * @dev Implementation contract for Group Public Key (GPK) functionality
 * This contract handles the core logic for GPK operations including:
 * - Group initialization and management
 * - Polynomial commitment submission and verification
 * - Encrypted share distribution and verification
 * - Timeout handling and slashing
 */
contract GpkDelegate is GpkStorageV2 {
    using SafeMath for uint;

    /**
     * @dev Events for tracking GPK operations
     */

    /**
     * @notice Emitted when a storeman submits their polynomial commitment
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param storeman The address of the storeman
     */
    event SetPolyCommitLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address storeman);

    /**
     * @notice Emitted when a storeman submits an encrypted share
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @param dest The destination storeman address
     */
    event SetEncSijLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest);

    /**
     * @notice Emitted when a storeman verifies an encrypted share
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @param dest The destination storeman address
     * @param isValid Whether the encrypted share is valid
     */
    event SetCheckStatusLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest, bool isValid);

    /**
     * @notice Emitted when a storeman reveals their share
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @param dest The destination storeman address
     */
    event RevealSijLogger(bytes32 indexed groupId, uint16 indexed round, uint8 indexed curveIndex, address src, address dest);

    /**
     * @notice Emitted when a new GPK is created
     * @param groupId The ID of the storeman group
     * @param round The current negotiation round
     * @param gpk The array of GPK values
     */
    event GpkCreatedLogger(bytes32 indexed groupId, uint16 indexed round, bytes[] gpk);

    /**
     * @notice Emitted when GPK configuration is set
     * @param groupId The ID of the storeman group
     * @param count The number of GPK configurations
     */
    event setGpkCfgEvent(bytes32 indexed groupId, uint indexed count);

    /**
     * @dev Contract manipulation functions
    */

    /**
     * @notice Sets the dependencies for the contract
     * @dev Only callable by the contract owner
     * @param cfgAddr The address of the configuration contract
     * @param smgAddr The address of the storeman group contract
     * @dev Throws if either address is invalid
     */
    function setDependence(address cfgAddr, address smgAddr)
        external
        onlyOwner
    {
        require(cfgAddr != address(0), "Invalid cfg");
        cfg = cfgAddr;
              
        require(smgAddr != address(0), "Invalid smg");
        smg = smgAddr;
    }

    /**
     * @notice Sets the time periods for different phases of GPK generation
     * @dev Only callable by admin
     * @param groupId The ID of the storeman group
     * @param ployCommitPeriod The period for polynomial commitment submission
     * @param defaultPeriod The default timeout period
     * @param negotiatePeriod The period for negotiation phase
     */
    function setPeriod(bytes32 groupId, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod)
        external
        onlyAdmin
    {
        GpkTypes.Group storage group = groupMap[groupId];
        group.ployCommitPeriod = ployCommitPeriod;
        group.defaultPeriod = defaultPeriod;
        group.negotiatePeriod = negotiatePeriod;
    }

    /**
     * @notice Allows a storeman to submit their polynomial commitment
     * @dev Handles the polynomial commitment phase of GPK generation
     * @param groupId The ID of the storeman group
     * @param roundIndex The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param polyCommit The polynomial commitment data
     * @dev Throws if the commitment is invalid or duplicate
     * @dev Emits SetPolyCommitLogger event on success
     */
    function setPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, bytes memory polyCommit)
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
            GpkLib.initGroup(groupId, group, cfg, smg, curves);
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

    /**
     * @notice Reports timeout for polynomial commitment submission
     * @dev Handles slashing for storemen who failed to submit commitments
     * @param groupId The ID of the storeman group
     * @param curveIndex The index of the signature curve
     * @dev Throws if the timeout period has not elapsed
     */
    function polyCommitTimeout(bytes32 groupId, uint8 curveIndex)
        external
    {
        GpkTypes.Group storage group = groupMap[groupId];
        checkValid(group, group.round, curveIndex, GpkTypes.GpkStatus.PolyCommit, false, false, address(0));
        GpkTypes.Round storage round = group.roundMap[group.round][curveIndex];
        uint32 timeout = (group.round == 0) ? group.ployCommitPeriod : group.defaultPeriod;
        require(block.timestamp.sub(round.statusTime) > timeout, "Time not arrive");
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

    /**
     * @notice Allows a storeman to submit an encrypted share
     * @dev Handles the encrypted share distribution phase
     * @param groupId The ID of the storeman group
     * @param roundIndex The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param dest The destination storeman address
     * @param encSij The encrypted share data
     * @dev Throws if the encrypted share is invalid or duplicate
     * @dev Emits SetEncSijLogger event on success
     */
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

    /**
     * @notice Allows a storeman to verify an encrypted share
     * @dev Handles the verification phase of encrypted shares
     * @param groupId The ID of the storeman group
     * @param roundIndex The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @param isValid Whether the encrypted share is valid
     * @dev Throws if the share is not ready or already verified
     * @dev Emits SetCheckStatusLogger event on success
     */
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
                tryComplete(groupId, smg);
            }
        } else {
            d.checkStatus = GpkTypes.CheckStatus.Invalid;
        }
    }

    /**
     * @notice Reports timeout for encrypted share submission
     * @dev Handles slashing for storemen who failed to submit encrypted shares
     * @param groupId The ID of the storeman group
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @dev Throws if the share is already submitted or timeout period has not elapsed
     */
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

    /**
     * @notice Allows a storeman to reveal their share
     * @dev Handles the share revelation phase
     * @param groupId The ID of the storeman group
     * @param roundIndex The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param dest The destination storeman address
     * @param sij The share value
     * @param ephemPrivateKey The ephemeral private key
     * @dev Throws if the share is not needed or invalid
     * @dev Emits RevealSijLogger event on success
     */
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

    /**
     * @notice Reports timeout for share verification
     * @dev Handles slashing for storemen who failed to verify shares
     * @param groupId The ID of the storeman group
     * @param curveIndex The index of the signature curve
     * @param dest The destination storeman address
     * @dev Throws if the share is already verified or timeout period has not elapsed
     */
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

    /**
     * @notice Reports timeout for share submission
     * @dev Handles slashing for storemen who failed to submit shares
     * @param groupId The ID of the storeman group
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @dev Throws if the share is not needed or timeout period has not elapsed
     */
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

    /**
     * @notice Terminates the protocol for a group
     * @dev Handles the termination of the GPK generation protocol
     * @param groupId The ID of the storeman group
     * @param curveIndex The index of the signature curve
     * @dev Throws if the negotiation period has not elapsed
     */
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

    /**
     * @notice Validates parameters for group operations
     * @dev Internal function to check validity of group parameters
     * @param group The group structure
     * @param roundIndex The current negotiation round
     * @param curveIndex The index of the signature curve
     * @param status The expected group status
     * @param checkSender Whether to check the sender
     * @param checkStoreman Whether to check the storeman
     * @param storeman The storeman address
     * @dev Throws if any parameter is invalid
     */
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

    /**
     * @notice Gets information about a group
     * @param groupId The ID of the storeman group
     * @param roundIndex The round index to query (-1 for current round)
     * @return queriedRound The queried round number
     * @return curve1 The address of curve 1
     * @return curve1Status The status of curve 1
     * @return curve1StatusTime The status time of curve 1
     * @return curve2 The address of curve 2
     * @return curve2Status The status of curve 2
     * @return curve2StatusTime The status time of curve 2
     */
    function getGroupInfo(bytes32 groupId, int32 roundIndex)
        external
        view
        returns(uint16 queriedRound, address curve1, uint8 curve1Status, uint curve1StatusTime, address curve2, uint8 curve2Status, uint curve2StatusTime)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        queriedRound = (roundIndex >= 0)? uint16(uint32(roundIndex)) : group.round;
        GpkTypes.Round storage round1 = group.roundMap[queriedRound][0];
        GpkTypes.Round storage round2 = group.roundMap[queriedRound][1];
        return (queriedRound, round1.curve, uint8(round1.status), round1.statusTime, round2.curve, uint8(round2.status), round2.statusTime);
    }

    /**
     * @notice Gets the polynomial commitment for a storeman
     * @param groupId The ID of the storeman group
     * @param roundIndex The round index
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @return polyCommit The polynomial commitment data
     */
    function getPolyCommit(bytes32 groupId, uint16 roundIndex, uint8 curveIndex, address src)
        external
        view
        returns(bytes memory polyCommit)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        GpkTypes.Round storage round = group.roundMap[roundIndex][curveIndex];
        return round.srcMap[src].polyCommit;
    }

    /**
     * @notice Gets information about a share
     * @param groupId The ID of the storeman group
     * @param roundIndex The round index
     * @param curveIndex The index of the signature curve
     * @param src The source storeman address
     * @param dest The destination storeman address
     * @return encSij The encrypted share data
     * @return checkStatus The verification status
     * @return setTime The time when the share was set
     * @return checkTime The time when the share was verified
     * @return sij The share value
     * @return ephemPrivateKey The ephemeral private key
     */
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

    /**
     * @notice Gets the GPK share for a storeman
     * @param groupId The ID of the storeman group
     * @param index The index of the storeman
     * @return gpkShare1 The GPK share for curve 1
     * @return gpkShare2 The GPK share for curve 2
     */
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

    /**
     * @notice Gets the GPK for a group
     * @param groupId The ID of the storeman group
     * @return gpk1 The GPK for curve 1
     * @return gpk2 The GPK for curve 2
     */
    function getGpk(bytes32 groupId)
        external
        view
        returns(bytes memory gpk1, bytes memory gpk2)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        mapping(uint8 => GpkTypes.Round) storage roundMap = groupMap[groupId].roundMap[group.round];
        return (roundMap[0].gpk, roundMap[1].gpk);
    }

    /**
     * @notice Gets the GPK for a specific index
     * @param groupId The ID of the storeman group
     * @param gpkIndex The index of the GPK
     * @return gpk The GPK data
     */
    function getGpkbyIndex(bytes32 groupId, uint8 gpkIndex)
        external
        view
        returns(bytes memory gpk)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        mapping(uint8 => GpkTypes.Round) storage roundMap = groupMap[groupId].roundMap[group.round];
        return roundMap[gpkIndex].gpk;
    }

    /**
     * @notice Gets the GPK share for a specific storeman and index
     * @param groupId The ID of the storeman group
     * @param smIndex The index of the storeman
     * @param gpkIndex The index of the GPK
     * @return gpkShare The GPK share data
     */
    function getGpkSharebyIndex(bytes32 groupId, uint16 smIndex, uint8 gpkIndex)
        external
        view
        returns(bytes memory gpkShare)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        address src = group.addrMap[smIndex];
        mapping(uint8 => GpkTypes.Round) storage roundMap = groupMap[groupId].roundMap[group.round];
        return roundMap[gpkIndex].srcMap[src].gpkShare;
    }

    /**
     * @notice Gets the number of GPKs for a group
     * @param groupId The ID of the storeman group
     * @return count The number of GPKs
     */
    function getGpkCount(bytes32 groupId) public view returns(uint count) {
        return gpkCount[groupId];
    }

    /**
     * @notice Gets the GPK configuration for a group
     * @param groupId The ID of the storeman group
     * @param index The index of the configuration
     * @return curveIndex The index of the curve
     * @return algoIndex The index of the algorithm
     */
    function getGpkCfgbyGroup(bytes32 groupId, uint index) external view  returns(uint curveIndex, uint algoIndex) {
        return (curve[groupId][index], algo[groupId][index]);
    }

    /**
     * @notice Sets the GPK configuration for a group
     * @dev Only callable by admin
     * @param groupId The ID of the storeman group
     * @param curIndex The array of curve indices
     * @param algoIndex The array of algorithm indices
     * @dev Throws if the arrays are empty or have different lengths
     * @dev Emits setGpkCfgEvent on success
     */
    function setGpkCfg(bytes32 groupId, uint[] memory curIndex, uint[] memory algoIndex) external onlyAdmin {
        require(curIndex.length != 0, "empty curve");
        require(curIndex.length == algoIndex.length, "invalid length");
        gpkCount[groupId] = curIndex.length;
        for(uint i=0; i<gpkCount[groupId]; i++) {
            algo[groupId][i] = algoIndex[i];
            curve[groupId][i] = curIndex[i];
        }
        emit setGpkCfgEvent(groupId, gpkCount[groupId]);
    }

    /**
     * @notice Attempts to complete the GPK generation process
     * @dev Internal function to handle GPK completion
     * @param groupId The ID of the storeman group
     * @param smg The address of the storeman group contract
     */
    function tryComplete(bytes32 groupId, address smg)
        internal
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
    
    /**
     * @notice Gets group information for a specific GPK index
     * @param groupId The ID of the storeman group
     * @param roundIndex The round index to query (-1 for current round)
     * @param gpkIndex The index of the GPK
     * @return queriedRound The queried round number
     * @return curve The address of the curve
     * @return curveStatus The status of the curve
     * @return curveStatusTime The status time of the curve
     */
    function getGroupInfobyIndex(bytes32 groupId, int32 roundIndex, uint8 gpkIndex)
        external
        view
        returns(uint16 queriedRound, address curve, uint8 curveStatus, uint curveStatusTime)
    {
        GpkTypes.Group storage group = groupMap[groupId];
        queriedRound = (roundIndex >= 0)? uint16(uint32(roundIndex)) : group.round;
        GpkTypes.Round storage round = group.roundMap[queriedRound][gpkIndex];
        return (queriedRound, round.curve, uint8(round.status), round.statusTime);
    }
}
