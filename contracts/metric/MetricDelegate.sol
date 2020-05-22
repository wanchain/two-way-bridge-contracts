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
import "../interfaces/IStoremanGroup.sol";
import "../lib/SafeMath.sol";

contract MetricDelegate is MetricStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * MODIFIERS
     *
     */
    modifier onlyValidGrpId (bytes32 grpId) {
        require( grpId.length > 0 , "Invalid group ID");
        _;
    }

    modifier initialized {
        require(config != IConfig(address(0)), "Global configure is null");
        require(smg != IStoremanGroup(address(0)), "Smg is null");
        _;
    }

    /**
     *
     * MANIPULATIONS
     *
     */
    function getDependence()
    external
    view
    returns (address,address)
    {
        return (config,smg);
    }

    ///=======================================statistic=============================================
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (uint[]) {
        require(endEpId > startEpId, "End epochId should be more than start epochId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < endEpId; j++){
                ret[i] += metricData.mapInctCount[grpId][j][i];
            }
        }
        return ret;
    }

    function getPrdSlshMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns(uint[])
    {
        require(endEpId > startEpId, "End epochId should be more than start epochId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < endEpId; j++){
                ret[i] += metricData.mapSlshCount[grpId][j][i];
            }
        }
        return ret;
    }

    function getSmSuccCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return metricData.mapInctCount[grpId][epId][smIndex];
    }

    function getSlshCntByEpId(bytes32 grpId, uint epId, uint8 smIndex)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return metricData.mapSlshCount[grpId][epId][smIndex];
    }

    // todo get proof is used for front end.
    function getRSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.SSlshData)
    {
        MetricTypes.SSlshData memory sslshData;
        return sslshData;
    }

    // todo get proof is used for front end.
    function getSSlshProof(bytes32 grpId, bytes32 hashX, uint8 smIndex, MetricTypes.SlshReason slshReason)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (MetricTypes.RSlshData)
    {
        MetricTypes.RSlshData memory rslshData;
        return rslshData;
    }


///=======================================write incentive and slash=============================================

    /// todo white list can write the working record
    function wrInct(bytes32 grpId, bytes32 hashX, uint  inctData)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        metricData.mapInct[grpId][hashX].smIndexes = inctData;
        uint8 smCount = getSMCount(grpId);
        uint epochId = getEpochId();

        for (uint8 i = 0; i < smCount; i++) {
            if (checkHamming(inctData,i)){
                metricData.mapInctCount[grpId][epochId][i] += 1;
            }
        }
    }

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
            if (checkHamming(rnwData,i)){
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.RNK);
            }
        }
    }

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
            if (checkHamming(snwData,i)){
                metricData.mapSlshCount[grpId][epochId][i] += 1;

                emit SMSlshLogger(grpId, hashX, i, MetricTypes.SlshReason.SNK);
            }
        }
    }



    function wrRSlshPolyCM(bytes32 grpId, bytes32 hashX, uint8[2] sndrAndRcvrIndex,bool becauseSndr,
        bytes polyCM,bytes polyCMR,bytes polyCMS)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

        require( sndrAndRcvrIndex.length == uint(2), "sender or receiver index missing.");

        uint8 smIndex;
        if(becauseSndr){
            smIndex = sndrAndRcvrIndex[0];
        }else{
            smIndex = sndrAndRcvrIndex[1];
        }

        //todo dupilicate? allow users update the proof?
        MetricTypes.RSlshData  rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];

        // write working record

        rslshData.polyCMData.polyCM = polyCM;
        rslshData.polyCMData.polyCMR = polyCMR;
        rslshData.polyCMData.polyCMS = polyCMS;


        rslshData.sndrIndex = sndrAndRcvrIndex[0];
        rslshData.rcvrIndex = sndrAndRcvrIndex[1];
        rslshData.becauseSndr = becauseSndr;

    }

    // todo how to make sure atom operation?
    function wrRSlshPolyData(bytes32 grpId, bytes32 hashX, uint8[2] sndrAndRcvrIndex,bool becauseSndr,
        bytes polyData,bytes polyDataR,bytes polyDataS)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        require( sndrAndRcvrIndex.length == uint(2), "sender or receiver index missing.");

        uint8 smIndex;
        if(becauseSndr){
            smIndex = sndrAndRcvrIndex[0];
        }else{
            smIndex = sndrAndRcvrIndex[1];
        }

        //todo dupilicate? allow users update the proof?
        MetricTypes.RSlshData  rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];

        require( rslshData.polyCMData.polyCM.length != 0, "polyCM is empty");
        require( rslshData.polyCMData.polyCMR.length != 0, "polyCMR is empty");
        require( rslshData.polyCMData.polyCMS.length != 0, "polyCMS is empty");

        // write working record

        rslshData.polyDataPln.polyData = polyData;
        rslshData.polyDataPln.polyDataR = polyDataR;
        rslshData.polyDataPln.polyDataS = polyDataS;

        if (checkRProof(grpId,hashX,smIndex)){
            // update the  count
            metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
            // emit the event
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
        }else{
            emit SMInvSlshLogger(msg.sender,grpId, hashX, smIndex, MetricTypes.SlshReason.R);
            delete  metricData.mapRSlsh[grpId][hashX][smIndex];
        }
    }


    function wrSSlshShare(bytes32 grpId, bytes32 hashX, uint8[2] sndrAndRcvrIndex,bool becauseSndr,
        bytes gpkShare,bytes rpkShare,bytes m)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        require( sndrAndRcvrIndex.length == uint(2), "sender or receiver index missing.");
        uint8 smIndex;
        if(becauseSndr){
            smIndex = sndrAndRcvrIndex[0];
        }else{
            smIndex = sndrAndRcvrIndex[1];
        }

        //todo dupilicate? allow users update the proof?
        MetricTypes.SSlshData  sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];
        // write working record

        sslshData.m  = m;
        sslshData.rpkShare = rpkShare;
        sslshData.gpkShare = gpkShare;


        sslshData.sndrIndex = sndrAndRcvrIndex[0];
        sslshData.rcvrIndex = sndrAndRcvrIndex[1];
        sslshData.becauseSndr = becauseSndr;

    }

    // todo how to make sure atom operation?
    function wrSSlshPolyPln(bytes32 grpId, bytes32 hashX, uint8[2] sndrAndRcvrIndex,bool becauseSndr,
        bytes polyData,bytes polyDataR,bytes polyDataS)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        require( sndrAndRcvrIndex.length == uint(2), "sender or receiver index missing.");

        uint8 smIndex;
        if(becauseSndr){
            smIndex = sndrAndRcvrIndex[0];
        }else{
            smIndex = sndrAndRcvrIndex[1];
        }

        //todo dupilicate? allow users update the proof?
        MetricTypes.SSlshData  sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];

        require( sslshData.m.length != 0, "m is empty");
        require( sslshData.rpkShare.length != 0, "rpkShare is empty");
        require( sslshData.gpkShare.length != 0, "gpkShare is empty");
        // write working record

        sslshData.polyDataPln.polyData  = polyData;
        sslshData.polyDataPln.polyDataR  = polyDataR;
        sslshData.polyDataPln.polyDataS  = polyDataS;

        if (checkSProof(grpId,hashX,smIndex)){
            // update the  count
            metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
            // emit the event
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
        }else{
            emit SMInvSlshLogger(msg.sender,grpId, hashX, smIndex, MetricTypes.SlshReason.S);
            delete  metricData.mapSSlsh[grpId][hashX][smIndex];
        }

    }


///=======================================check proof =============================================
    // todo check the proof for all white list can write working record
    // todo check proof by pre-compile contract
    function checkRProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        return true;
    }

    // todo check the proof for all white list can write working record
    // todo check proof by pre-compile contract
    function checkSProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        return true;
    }


/// @notice                           function for set config and smg contract address
/// @param configAddr                 config contract address
/// @param smgAddr               smg contract address
    function setDependence(address configAddr, address smgAddr)
    external
    onlyOwner
    {
        require(configAddr != address(0), "Invalid config address");
        require(smgAddr != address(0), "Invalid smg address");

        config = IConfig(configAddr);
        smg = IStoremanGroup(smgAddr);
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
    function getSMCount(bytes32 grpId)
    internal
    view
    returns (uint8)
    {
        return uint8(smg.getSelectedSmNumber(grpId));
    }

    function checkHamming(uint indexes, uint8 smIndex)
    internal
    pure
    returns (bool)
    {
        return indexes & (uint(1)<<smIndex) != uint(0);
   }

    function () public payable {
        revert("Not support");
    }
}
