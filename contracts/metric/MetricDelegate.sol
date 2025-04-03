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
//

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../components/Halt.sol";

import "./MetricStorage.sol";
import "./lib/MetricTypes.sol";
import "../interfaces/IStoremanGroup.sol";
import "../lib/CommonTool.sol";
import "./lib/MetricLib.sol";
import "../interfaces/IPosLib.sol";

/**
 * @title MetricDelegate
 * @dev Implementation contract for metric system
 * This contract handles the recording and retrieval of metrics, incentives, and slashing data
 * for the storeman group system
 */
contract MetricDelegate is MetricStorage, Halt{
    using SafeMath for uint;
    using MetricLib for MetricTypes.MetricStorageData;

    /**
     * @dev Modifiers for access control
     */

    /**
     * @dev Ensures that only the group leader can call the function
     * @param grpId The ID of the storeman group
     * @dev Throws if the caller is not the group leader
     */
    modifier onlyLeader(bytes32 grpId) {
        address leader;
        leader = metricData.getLeader(grpId);
        require(msg.sender == leader, "Not leader");
        _;
    }

    /**
     * @dev Core metric operations
     */

    /**
     * @notice Retrieves the addresses of dependent contracts
     * @return address The configuration contract address
     * @return address The storeman group contract address
     * @return address The position library contract address
     */
    function getDependence()
    external
    view
    returns (address, address,address)
    {
        return (metricData.config, metricData.smg, metricData.posLib);
    }

    /**
     * @dev Statistics functions
     */

    /**
     * @notice Retrieves incentive counts for all storemen during specified epochs
     * @param grpId The ID of the storeman group
     * @param startEpId The starting epoch ID
     * @param endEpId The ending epoch ID
     * @return uint[] Array of incentive counts for each storeman
     * @dev Throws if endEpId is less than startEpId
     */
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    returns (uint[] memory) {
        require(endEpId >= startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j <= endEpId; j++) {
                ret[i] = ret[i].add(metricData.mapInctCount[grpId][j][i]);
            }
        }
        return ret;
    }

    /**
     * @notice Retrieves slash counts for all storemen during specified epochs
     * @param grpId The ID of the storeman group
     * @param startEpId The starting epoch ID
     * @param endEpId The ending epoch ID
     * @return uint[] Array of slash counts for each storeman
     * @dev Throws if endEpId is less than startEpId
     */
    function getPrdSlshMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    returns (uint[] memory)
    {
        require(endEpId >= startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j <= endEpId; j++) {
                ret[i] = ret[i].add(metricData.mapSlshCount[grpId][j][i]);
            }
        }
        return ret;
    }

    /**
     * @notice Retrieves the success count for a specific storeman in an epoch
     * @param grpId The ID of the storeman group
     * @param epId The epoch ID
     * @param smIndex The index of the storeman
     * @return uint The success count
     */
    function getSmSuccCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    returns (uint)
    {
        return metricData.mapInctCount[grpId][epId][smIndex];
    }

    /**
     * @notice Retrieves the slash count for a specific storeman in an epoch
     * @param grpId The ID of the storeman group
     * @param epId The epoch ID
     * @param smIndex The index of the storeman
     * @return uint The slash count
     */
    function getSlshCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    returns (uint)
    {
        return metricData.mapSlshCount[grpId][epId][smIndex];
    }

    /**
     * @notice Retrieves the R stage slash proof for a specific storeman
     * @param grpId The ID of the storeman group
     * @param hashX The hash of the signed data
     * @param smIndex The index of the storeman
     * @return MetricTypes.RSlshData The R stage slash proof data
     */
    function getRSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    external
    view
    returns (MetricTypes.RSlshData memory)
    {
        return metricData.mapRSlsh[grpId][hashX][smIndex];
    }

    /**
     * @notice Retrieves the S stage slash proof for a specific storeman
     * @param grpId The ID of the storeman group
     * @param hashX The hash of the signed data
     * @param smIndex The index of the storeman
     * @return MetricTypes.SSlshData The S stage slash proof data
     */
    function getSSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    external
    view
    returns (MetricTypes.SSlshData memory)
    {
        return metricData.mapSSlsh[grpId][hashX][smIndex];
    }

    /**
     * @dev Write operations for incentives and slashing
     */

    /**
     * @notice Records incentive data for storemen
     * @param grpId The ID of the storeman group
     * @param hashX The hash of the signed data
     * @param inctData The bitmap of incentivized storemen
     * @dev Only callable by the group leader when not halted
     * @dev Throws if incentive data already exists
     */
    function wrInct(bytes32 grpId, bytes32 hashX, uint inctData)
    external
    notHalted
    onlyLeader(grpId)
    {

        require(metricData.mapInct[grpId][hashX].smIndexes == uint(0), 'Duplicate Incentive');

        metricData.mapInct[grpId][hashX].smIndexes = inctData;
        uint8 smCount = getSMCount(grpId);
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(inctData, i)) {
                metricData.mapInctCount[grpId][epochId][i] = metricData.mapInctCount[grpId][epochId][i].add(uint(1));
            }
        }
    }

    /**
     * @notice Records R stage slash data
     * @param grpId The ID of the storeman group
     * @param hashX The hash of the signed data
     * @param rslshData The R stage slash data
     * @dev Only callable by the group leader when not halted
     * @dev Throws if slash data writing fails
     * @dev Emits SMSlshLogger event on success
     */
    function wrRSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.RSlshData memory rslshData)
    public
    notHalted
    onlyLeader(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeRSlsh(grpId, hashX, rslshData, getSMCount(grpId));
        require(success, 'Fail to write R slsh');

        metricData.recordSmSlash(grpId, smIndex);

        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
    }

    /**
     * @notice Records S stage slash data
     * @param grpId The ID of the storeman group
     * @param hashX The hash of the signed data
     * @param sslshData The S stage slash data
     * @dev Only callable by the group leader when not halted
     * @dev Throws if slash data writing fails
     * @dev Emits SMSlshLogger event on success
     */
    function wrSSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.SSlshData memory sslshData)
    public
    notHalted
    onlyLeader(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeSSlsh(grpId, hashX, sslshData, getSMCount(grpId));
        require(success, 'Fail to write S Slsh');

        metricData.recordSmSlash(grpId, smIndex);

        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
    }

    /**
     * @notice Sets the addresses of dependent contracts
     * @param configAddr The configuration contract address
     * @param smgAddr The storeman group contract address
     * @param posAddr The position library contract address
     * @dev Only callable by the contract owner
     * @dev Throws if any address is invalid
     */
    function setDependence(address configAddr, address smgAddr, address posAddr)
    external
    onlyOwner
    {
        require(configAddr != address(0), "Invalid config address");
        require(smgAddr != address(0), "Invalid smg address");
        require(posAddr != address(0), "Invalid posLib address");

        metricData.config = configAddr;
        metricData.smg = smgAddr;
        metricData.posLib = posAddr;
    }

    /**
     * @dev Internal helper functions
     */

    /**
     * @notice Gets the number of storemen in a group
     * @param grpId The ID of the storeman group
     * @return uint8 The number of storemen
     */
    function getSMCount(bytes32 grpId)
    private
    view
    returns (uint8)
    {
        return uint8(metricData.getSMCount(grpId));
    }

    /**
     * @notice Gets the current epoch ID based on block timestamp
     * @return uint The current epoch ID
     */
    function getEpochId()
    private
    view
    returns (uint)
    {
        return IPosLib(metricData.posLib).getEpochId(block.timestamp);
    }

    function checkHamming(uint indexes, uint8 smIndex)
    private
    pure
    returns (bool)
    {
        return indexes & (uint(1) << smIndex) != uint(0);
    }

    receive() external payable {
        revert("Not support");
    }

}
