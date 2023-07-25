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

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./MetricStorage.sol";
import "./lib/MetricTypes.sol";
import "../interfaces/IStoremanGroup.sol";
import "../lib/CommonTool.sol";
import "./lib/MetricLib.sol";
import "../interfaces/IPosLib.sol";

contract MetricDelegate is Initializable, Ownable, Pausable, MetricStorage{
    using SafeMath for uint;
    using MetricLib for MetricTypes.MetricStorageData;

    /**
     *
     * MODIFIERS
     *
     */
    modifier onlyLeader(bytes32 grpId) {
        address leader;
        leader = metricData.getLeader(grpId);
        require(msg.sender == leader, "Not leader");
        _;
    }

    /* initializer */
    function initialize() external initializer {
        owner = msg.sender;
    }

    /**
     *
     * MANIPULATIONS
     *
     */
    function getDependence()
    external
    view
    returns (address, address,address)
    {
        return (metricData.config, metricData.smg, metricData.posLib);
    }

    ///=======================================statistic=============================================

    /// @notice                         function for get incentive count of all store man during special epochs
    /// @param grpId                    group id
    /// @param startEpId                start epoch id
    /// @param endEpId                  end epoch id
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
    /// @notice                         function for get slash count of all store man during special epochs
    /// @param grpId                    group id
    /// @param startEpId                start epoch id
    /// @param endEpId                  end epoch id
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
    /// @notice                         function for get success count of sign data
    /// @param grpId                    group id
    /// @param epId                     epoch id
    /// @param smIndex                  index of store man
    function getSmSuccCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    returns (uint)
    {
        return metricData.mapInctCount[grpId][epId][smIndex];
    }
    /// @notice                         function for get slash count of one store man
    /// @param grpId                    group id
    /// @param epId                     epoch id
    /// @param smIndex                  index of store man
    function getSlshCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    returns (uint)
    {
        return metricData.mapSlshCount[grpId][epId][smIndex];
    }

    /// @notice                         function for get R stage slash proof of one store man
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function getRSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    external
    view
    returns (MetricTypes.RSlshData memory)
    {
        return metricData.mapRSlsh[grpId][hashX][smIndex];

    }
    /// @notice                         function for get S stage slash proof of one store man
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function getSSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    external
    view
    returns (MetricTypes.SSlshData memory)
    {
        return metricData.mapSSlsh[grpId][hashX][smIndex];
    }

    ///=======================================write incentive and slash=============================================

    /// @notice                         function for write incentive data
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param inctData                 incentive store man's bitmap
    function wrInct(bytes32 grpId, bytes32 hashX, uint inctData)
    external
    whenNotPaused
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
    /// @notice                         function for write R stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param rslshData                data of slash
    function wrRSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.RSlshData memory rslshData)
    public
    whenNotPaused
    onlyLeader(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeRSlsh(grpId, hashX, rslshData, getSMCount(grpId));
        require(success, 'Fail to write R slsh');

        metricData.recordSmSlash(grpId, smIndex);

        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
    }
    /// @notice                         function for write S stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param sslshData                data of slash
    function wrSSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.SSlshData memory sslshData)
    public
    whenNotPaused
    onlyLeader(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeSSlsh(grpId, hashX, sslshData, getSMCount(grpId));
        require(success, 'Fail to write S Slsh');

        metricData.recordSmSlash(grpId, smIndex);

        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
    }

    /// @notice                         function for set config and smg contract address
    /// @param configAddr               config contract address
    /// @param smgAddr                  smg contract address
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


    function getSMCount(bytes32 grpId)
    private
    view
    returns (uint8)
    {
        return uint8(metricData.getSMCount(grpId));
    }

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

    /// @notice function Emergency situation that requires
    /// @notice contribution period to stop or not.
    function setHalt(bool halt)
        public
        onlyOwner
    {
        if (halt) {
            _pause();
        } else {
            _unpause();
        }
    }

}
