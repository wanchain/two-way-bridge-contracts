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
import "../lib/PosLib.sol";

contract MetricDelegate is MetricStorage, Halt {
    using SafeMath for uint;

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

    function _checkGrpId(bytes32 grpId) internal view{
        require(grpId.length > 0, "grpId null");
    }

    function _initialized() internal view{
        require(config != IConfig(address(0)), "IConfig null");
        require(smg != IStoremanGroup(address(0)), "Smg null");
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
        return (config, smg);
    }

    ///=======================================statistic=============================================
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId)
    external
    view
    initialized
    onlyValidGrpId(grpId)
    returns (uint[]) {
        require(endEpId > startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < endEpId; j++) {
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
    returns (uint[])
    {
        require(endEpId > startEpId, "endEpId<startEpId");
        uint[] memory ret;
        uint8 n = getSMCount(grpId);
        ret = new uint[](n);
        for (uint8 i = 0; i < n; i++) {
            for (uint j = startEpId; j < endEpId; j++) {
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

    function wrRSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.RSlshData memory rslshData)
    public
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {
        uint8 smCount = getSMCount(grpId);
        require(rslshData.sndrIndex <= smCount, "invalid send index");
        require(rslshData.rcvrIndex <= smCount, "invalid receiver index");

        require(rslshData.polyCMData.polyCM.length != 0, "polyCM is empty");
        require(rslshData.polyCMData.polyCMR.length != 0, "polyCMR is empty");
        require(rslshData.polyCMData.polyCMS.length != 0, "polyCMS is empty");

        require(rslshData.polyDataPln.polyData.length != 0, "polyData is empty");
        require(rslshData.polyDataPln.polyDataR.length != 0, "polyDataR is empty");
        require(rslshData.polyDataPln.polyDataS.length != 0, "polyDataS is empty");


        uint8 smIndex;
        smIndex = rslshData.becauseSndr ? rslshData.sndrIndex : rslshData.rcvrIndex;

        metricData.mapRSlsh[grpId][hashX][smIndex] = rslshData;

        if (checkRProof(grpId, hashX, smIndex)) {
            // update the  count
            metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
            // emit the event
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.R);
        } else {
            emit SMInvSlshLogger(msg.sender, grpId, hashX, smIndex, MetricTypes.SlshReason.R);
            delete metricData.mapRSlsh[grpId][hashX][smIndex];
        }
    }

    function wrSSlsh(bytes32 grpId, bytes32 hashX, MetricTypes.SSlshData memory sslshData)
    public
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

        uint8 smCount = getSMCount(grpId);
        require(sslshData.sndrIndex <= smCount, "invalid send index");
        require(sslshData.rcvrIndex <= smCount, "invalid receiver index");

        require(sslshData.m.length != 0, "m is empty");
        require(sslshData.rpkShare.length != 0, "rpkShare is empty");
        require(sslshData.gpkShare.length != 0, "gpkShare is empty");

        require(sslshData.polyDataPln.polyData.length != 0, "polyData is empty");
        require(sslshData.polyDataPln.polyDataR.length != 0, "polyDataR is empty");
        require(sslshData.polyDataPln.polyDataS.length != 0, "polyDataS is empty");

        uint8 smIndex;
        smIndex = sslshData.becauseSndr ? sslshData.sndrIndex : sslshData.rcvrIndex;
        metricData.mapSSlsh[grpId][hashX][smIndex] = sslshData;

        if (checkSProof(grpId, hashX, smIndex)) {
            // update the  count
            metricData.mapSlshCount[grpId][getEpochId()][smIndex] += 1;
            // emit the event
            emit SMSlshLogger(grpId, hashX, smIndex, MetricTypes.SlshReason.S);
        } else {
            emit SMInvSlshLogger(msg.sender, grpId, hashX, smIndex, MetricTypes.SlshReason.S);
            delete metricData.mapSSlsh[grpId][hashX][smIndex];
        }
    }


    ///=======================================check proof =============================================
    function checkRProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        bool bSig = checkRSig(grpId, hashX, smIndex);
        bool bContent = checkRContent(grpId, hashX, smIndex);
        return getChkResult(bSig, bContent, metricData.mapRSlsh[grpId][hashX][smIndex].becauseSndr);
    }

    function getChkResult(bool bSig, bool bContent, bool becauseSndr)
    internal
    pure
    returns (bool)
    {
        if (!bSig || !bContent) {
            // should be sender
            if (becauseSndr) {
                return true;
            } else {
                return false;
            }
        } else {
            // should be receiver
            if (becauseSndr) {
                return false;
            } else {
                return true;
            }
        }
    }

    function getPkBytesByInx(bytes32 grpId, uint8 smIndex)
    internal
    view
    initialized
    onlyValidGrpId(grpId)
    returns (bytes)
    {
        bytes memory smPk;
        (, smPk,) = smg.getSelectedSmInfo(grpId, uint(smIndex));
        return smPk;
    }

    function checkRSig(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        bytes32 h;
        bytes32 r;
        bytes32 s;
        bytes memory senderPk;

        MetricTypes.RSlshData rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(rslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(grpId, smIndex);
        // build r
        r = CommonTool.bytesToBytes32(rslshData.polyDataPln.polyDataR);
        // build s
        s = CommonTool.bytesToBytes32(rslshData.polyDataPln.polyDataS);
        return CommonTool.checkSig(h, r, s, senderPk);
    }

    function checkRContent(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        uint256 xLeft;
        uint256 yLeft;

        uint256 xRight;
        uint256 yRight;
        bool success;

        bytes memory sij;
        bytes memory rcvrPk;
        MetricTypes.RSlshData memory rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];
        sij = rslshData.polyDataPln.polyData;
        rcvrPk = getPkBytesByInx(grpId, rslshData.rcvrIndex);

        // left point compute by CMG
        (xLeft, yLeft, success) = CommonTool.calPolyCommit(rslshData.polyCMData.polyCM, rcvrPk);
        require(success, 'calPolyCommit fail');

        // right point s[i][i]*G
        uint256 uintSij = CommonTool.bytes2uint(sij, 0);
        (xRight, yRight, success) = CommonTool.mulG(uintSij);
        require(success, 'mulG fail');
        return xLeft == xRight && yLeft == yRight;
        //return true;
    }

    // todo check the proof for all white list can write working record
    function checkSProof(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        bool bSig = checkSSig(grpId, hashX, smIndex);
        bool bContent = checkSContent(grpId, hashX, smIndex);
        return getChkResult(bSig, bContent, metricData.mapSSlsh[grpId][hashX][smIndex].becauseSndr);
    }

    function checkSSig(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        bytes32 h;
        bytes32 r;
        bytes32 s;
        bytes memory senderPk;

        MetricTypes.SSlshData sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(sslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(grpId, smIndex);
        // build r
        r = CommonTool.bytesToBytes32(sslshData.polyDataPln.polyDataR);
        // build s
        s = CommonTool.bytesToBytes32(sslshData.polyDataPln.polyDataS);
        return CommonTool.checkSig(h, r, s, senderPk);
    }

    function checkSContent(bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    initialized
    onlyValidGrpId(grpId)
    returns (bool)
    {
        bool success;
        uint xLeft;
        uint yLeft;

        uint xRight;
        uint yRight;

        uint mgpkX;
        uint mgpkY;

        MetricTypes.SSlshData memory sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];
        // s*G
        (xRight, yRight, success) = CommonTool.mulG(CommonTool.bytes2uint(sslshData.polyDataPln.polyData, 0));
        require(success, 'mulG fail');
        // rpkShare + m * gpkShare
        (mgpkX, mgpkY, success) = CommonTool.mulPk(CommonTool.bytes2uint(sslshData.m, 0),
            CommonTool.bytes2uint(sslshData.gpkShare, 1),
            CommonTool.bytes2uint(sslshData.gpkShare, 33));
        require(success, 'mulPk fail');

        (xLeft, yLeft, success) = CommonTool.add(CommonTool.bytes2uint(sslshData.rpkShare, 1),
            CommonTool.bytes2uint(sslshData.rpkShare, 33),
            mgpkX,
            mgpkY);
        require(success, 'add fail');

        return xLeft == xRight && yLeft == yRight;

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

    function getEpochId()
    internal
    view
    returns (uint)
    {
        return PosLib.getEpochId(now);
    }

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
        return indexes & (uint(1) << smIndex) != uint(0);
    }

    function() public payable {
        revert("Not support");
    }

}
