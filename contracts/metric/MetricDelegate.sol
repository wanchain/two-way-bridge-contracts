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
//

pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "../components/Halt.sol";
import "./MetricStorage.sol";
import "./lib/MetricTypes.sol";
import "../interfaces/IMortgage.sol";
import "../lib/SafeMath.sol";

contract MetricDelegate is MetricStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * MODIFIERS
     *
     */
    modifier onlyValidGrpId (bytes grpId) {
        require( grpId.length > 0 , "Invalid group ID");
        _;
    }

    modifier initialized {
        require(config != IConfig(address(0)), "Global configure is null");
        require(mortgage != IMortgage(address(0)), "Mortage is null");
        _;
    }

    /**
     *
     * MANIPULATIONS
     *
     */

    ///=======================================statistic=============================================
    function getPrdInctMetric(bytes grpId, uint startEpId, uint endEpId)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (uint[]) {
        require(endEpId > startEpId, "End epochId should be more than start epochId");
        uint[] memory ret;
        uint8 n = mortgage.getTotalNumber(grpId);

        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < startEpId; j++){
                ret[i] += metricData.mapInctCount[grpId][j][i];
            }
        }
        return ret;
    }

    function getPrdSlshMetric(bytes grpId, uint startEpId, uint endEpId)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns(uint[])
    {
        require(endEpId > startEpId, "End epochId should be more than start epochId");
        uint[] memory ret;
        uint8 n = mortgage.getTotalNumber(grpId);

        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < startEpId; j++){
                ret[i] += metricData.mapSlshCount[grpId][j][i];
            }
        }
        return ret;
    }

    function getSmSuccCntByEpId(bytes grpId, uint epId, uint8 smIndex)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return metricData.mapInctCount[grpId][epId][smIndex];
    }

    function getSlshCntByEpId(bytes grpId, uint epId, uint8 smIndex)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return metricData.mapSlshCount[grpId][epId][smIndex];
    }

    // todo get proof is used for front end.
    function getRSlshProof(bytes grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.SSlshData)
    {
        MetricTypes.SSlshData memory sslshData;
        return sslshData;
    }

    // todo get proof is used for front end.
    function getSSlshProof(bytes grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.RSlshData)
    {
        MetricTypes.RSlshData memory rslshData;
        return rslshData;
    }


///=======================================write incentive and slash=============================================

    /// todo white list can write the working record
    function wrInct(bytes grpId, bytes32 hashX, MetricTypes.InctData inctData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapInct[grpId][hashX] = inctData;

        uint8 smCount = getSMCount();
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(inctData.smIndexes,i)){
                metricData.mapInctCount[grpId][epochId][i] += 1;
            }
        }
    }

    function wrRNW(bytes grpId, bytes32 hashX, MetricTypes.RNWData rnwData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapRNW[grpId][hashX] = rnwData;

        uint8 smCount = getSMCount();
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(rnwData.smIndexes,i)){
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.RNK);
            }
        }
    }

    function wrSNW(bytes grpId, bytes32 hashX, MetricTypes.SNWData snwData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapSNW[grpId][hashX] = snwData;

        uint8 smCount = getSMCount();
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(snwData.smIndexes,i)){
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.SNK);
            }
        }
    }



    function wrRSlsh(bytes grpId, bytes32 hashX, uint8 smIndex,MetricTypes.RSlshData rsslshData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        // write working record
        metricData.mapRSlsh[grpId][hashX][smIndex] = rsslshData;

        // update the  count
        metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
        // emit the event
        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
    }

    function wrSSlsh(bytes grpId, bytes32 hashX, uint8 smIndex,MetricTypes.SSlshData sslshData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        // write working record
        metricData.mapSSlsh[grpId][hashX][smIndex] = sslshData;

        // update the  count
        metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
        // emit the event
        emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
    }


///=======================================check proof =============================================
    // todo check the proof for all white list can write working record
    function checkRProof(bytes grpId, bytes32 hashX, uint8 smIndex)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        return true;
    }

    // todo check the proof for all white list can write working record
    function checkSProof(bytes grpId, bytes32 hashX, uint8 smIndex)
    internal
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        return true;
    }


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

    // todo get EpochId from pre-compile contract
    function getEpochId()
    internal
    view
    returns (uint)
    {
        //uint memory timeStamp = now;
        uint epochTimespan = uint(5*12*1440);
        return now / epochTimespan;
    }

    // todo get EpochId from pre-compile contract
    function getSMCount()
    internal
    pure
    returns (uint8)
    {
        return uint8(21);
    }

    function checkHamming(uint indexes, uint8 smIndex)
    internal
    pure
    returns (bool)
    {
        return (indexes &= (1<<smIndex)) != uint(0);
    }
}

