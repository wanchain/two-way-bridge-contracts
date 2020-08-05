/*

  Copyright 2020 Wanchain Foundation.

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

pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "../components/Halt.sol";
import "./MetricStorage.sol";
import "./lib/MetricTypes.sol";
import "../interfaces/IStoremanGroup.sol";
import "../lib/SafeMath.sol";
import "../lib/CommonTool.sol";
import "./lib/MetricLib.sol";
import "../lib/PosLib.sol";

contract MetricDelegate is MetricStorage, Halt {
    using SafeMath for uint;
    using MetricLib for MetricTypes.MetricStorageData;

    /**
     *
     * MODIFIERS
     *
     */
    modifier onlyValidGrpId (bytes32 grpId) {
        _checkGrpId(grpId);
        _;
    }

    modifier initialized {
        _initialized();
        _;
    }

    function _checkGrpId(bytes32 grpId) internal view {
        require(grpId.length > 0, "grpId null");
    }

    function _initialized() internal view {
        require(IConfig(metricData.config) != IConfig(address(0)), "IConfig null");
        require(IStoremanGroup(metricData.smg) != IStoremanGroup(address(0)), "Smg null");
    }

    /**
     *
     * MANIPULATIONS
     *
     */
    function getDependence()
    external
    view
    returns (address, address)
    {
        return (metricData.config, metricData.smg);
    }

    ///=======================================statistic=============================================

    /// @notice                         function for get incentive count of all store man during special epochs
    /// @param grpId                    group id
    /// @param startEpId                start epoch id
    /// @param endEpId                  end epoch id
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (uint[]) {
        require(endEpId >= startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j <= endEpId; j++) {
                ret[i] += metricData.mapInctCount[grpId][j][i];
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
    initialized
    onlyValidGrpId(grpId)
    returns (uint[])
    {
        require(endEpId >= startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j <= endEpId; j++) {
                ret[i] += metricData.mapSlshCount[grpId][j][i];
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
    initialized
    onlyValidGrpId(grpId)
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
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return metricData.mapSlshCount[grpId][epId][smIndex];
    }

    /// @notice                         function for get R stage slash proof of one store man
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    /// @param slshReason               slash reason
    function getRSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.RSlshData)
    {
        require(slshReason == MetricTypes.SlshReason.R, "invalid slshReason");
        return metricData.mapRSlsh[grpId][hashX][smIndex];

    }
    /// @notice                         function for get S stage slash proof of one store man
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    /// @param slshReason               slash reason
    function getSSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.SSlshData)
    {
        require(slshReason == MetricTypes.SlshReason.S, "invalid slshReason");
        return metricData.mapSSlsh[grpId][hashX][smIndex];
    }

    ///=======================================write incentive and slash=============================================

    /// todo white list can write the working record
    /// @notice                         function for write incentive data
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param inctData                 incentive store man's bitmap
    function wrInct(bytes32 grpId, bytes32 hashX, uint inctData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapInct[grpId][hashX].smIndexes = inctData;
        uint8 smCount = getSMCount(grpId);
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(inctData, i)) {
                metricData.mapInctCount[grpId][epochId][i] += 1;
            }
        }
    }
    /// @notice                         function for write R stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param rnwData                  no working store man's bitmap in stage R
    function wrRNW(bytes32 grpId, bytes32 hashX, uint rnwData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapRNW[grpId][hashX].smIndexes = rnwData;

        uint8 smCount = getSMCount(grpId);
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(rnwData, i)) {
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.RNK);
            }
        }
    }
    /// @notice                         function for write S stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param snwData                  no working store man's bitmap in stage S
    function wrSNW(bytes32 grpId, bytes32 hashX, uint snwData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapSNW[grpId][hashX].smIndexes = snwData;

        uint8 smCount = getSMCount(grpId);
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(snwData, i)) {
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.SNK);
            }
        }
    }
    /// @notice                         function for write R stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param rslshData                data of slash
    function wrRSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.RSlshData memory rslshData)
    public
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeRSlsh(grpId, hashX, rslshData, getSMCount(grpId));
        if (success) {
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
        } else {
            emit SMInvSlshLogger(msg.sender, grpId, hashX, smIndex, MetricTypes.SlshReason.R);
        }
    }
    /// @notice                         function for write S stage slash
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param sslshData                data of slash
    function wrSSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.SSlshData memory sslshData)
    public
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        bool success;
        uint8 smIndex;
        (success, smIndex) = metricData.writeSSlsh(grpId, hashX, sslshData, getSMCount(grpId));
        if (success) {
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
        } else {
            emit SMInvSlshLogger(msg.sender, grpId, hashX, smIndex, MetricTypes.SlshReason.S);
        }
    }

    /// @notice                         function for set config and smg contract address
    /// @param configAddr               config contract address
    /// @param smgAddr                  smg contract address
    function setDependence(address configAddr, address smgAddr)
    external
    onlyOwner
    {
        require(configAddr != address(0), "Invalid config address");
        require(smgAddr != address(0), "Invalid smg address");

        metricData.config = IConfig(configAddr);
        metricData.smg = IStoremanGroup(smgAddr);
    }


    function getSMCount(bytes32 grpId)
    internal
    view
    returns (uint8)
    {
        return uint8(metricData.getSMCount(grpId));
    }

    function getEpochId()
    internal
    view
    returns (uint)
    {
        return PosLib.getEpochId(now);
    }

    function checkHamming(uint indexes, uint8 smIndex)
    internal
    pure
    returns (bool)
    {
        return indexes & (uint(1) << smIndex) != uint(0);
    }

    function() public payable {
        revert("Not support");
    }

}
