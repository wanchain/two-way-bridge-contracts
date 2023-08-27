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

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MetricTypes.sol";
import "../../lib/CommonTool.sol";
import "../../interfaces/IPosLib.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ICurve.sol";

library MetricLib {
    using SafeMath for uint;

    /// @notice                         function for write slash of R stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param rslshData                slash data of R stage
    /// @param smCount                  total number of store man
    function writeRSlsh(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, MetricTypes.RSlshData memory rslshData, uint8 smCount)
    internal
    returns (bool, uint8)
    {
        require(metricData.mapRSlsh[grpId][hashX][rslshData.sndrIndex].polyDataPln.polyData.length == 0,"Duplicate RSlsh");

        require(rslshData.sndrIndex <= smCount, "invalid send index");
        require(rslshData.rcvrIndex <= smCount, "invalid receiver index");

        require(rslshData.polyCMData.polyCM.length != 0, "polyCM is empty");
        require(rslshData.polyDataPln.polyData.length != 0, "polyData is empty");

        require(rslshData.becauseSndr, "R because sender is not true");

        uint8 smIndex;
        //smIndex = rslshData.becauseSndr ? rslshData.sndrIndex : rslshData.rcvrIndex;

        smIndex = rslshData.sndrIndex;

        metricData.mapRSlsh[grpId][hashX][smIndex] = rslshData;


        if (checkRProof(metricData, grpId, hashX, smIndex)) {
            metricData.mapSlshCount[grpId][getEpochId(metricData)][smIndex] = metricData.mapSlshCount[grpId][getEpochId(metricData)][smIndex].add(uint(1));
            return (true, smIndex);
        } else {
            delete metricData.mapRSlsh[grpId][hashX][smIndex];
            return (false, smIndex);
        }

    }


    /// @notice                         check proof of R stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkRProof(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bool bSig = checkRSig(metricData, grpId, hashX, smIndex);
        bool bContent = checkRContent(metricData, grpId, hashX, smIndex);
        return getChkResult(bSig, bContent);
    }
    /// @notice                         check signature of proof in R stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkRSig(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bytes32 h;
        bytes memory senderPk;

        MetricTypes.RSlshData memory rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(rslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(metricData, grpId, rslshData.sndrIndex);
        return ckSig(metricData,h, rslshData.polyDataPln.polyDataR, rslshData.polyDataPln.polyDataS, senderPk);
    }
    /// @notice                         check content of proof in R stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkRContent(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
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
        rcvrPk = getPkBytesByInx(metricData, grpId, rslshData.rcvrIndex);

        // left point compute by CMG  polyCM:= 64*n
        address curveAddr;
        curveAddr = IConfig(metricData.config).getCurve(uint8(rslshData.curveType));
        (xLeft, yLeft, success) = ICurve(curveAddr).calPolyCommit(rslshData.polyCMData.polyCM, rcvrPk);
        require(success, 'calPolyCommit fail');

        // right point s[i][i]*G
        uint256 uintSij = CommonTool.bytes2uint(sij, 0, uint16(sij.length));
        (xRight, yRight, success) = ICurve(curveAddr).mulG(uintSij);

        require(success, 'mulG fail');
        return ICurve(curveAddr).equalPt(xLeft,yLeft,xRight,yRight);
    }

    function getChkResult(bool bSig, bool bContent)
    internal
    pure
    returns (bool)
    {
        return !bSig || !bContent;
    }
    /// @notice                         function for write slash of S stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param sslshData                slash data of S stage
    /// @param smCount                  total number of store man
    function writeSSlsh(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, MetricTypes.SSlshData memory sslshData, uint8 smCount)
    public
    returns (bool, uint8)
    {
        require(metricData.mapSSlsh[grpId][hashX][sslshData.sndrIndex].polyDataPln.polyData.length == 0,"Duplicate SSlsh");

        require(sslshData.sndrIndex <= smCount, "invalid send index");
        require(sslshData.rcvrIndex <= smCount, "invalid receiver index");

        require(sslshData.m.length != 0, "m is empty");
        require(sslshData.rpkShare.length != 0, "rpkShare is empty");
        require(sslshData.gpkShare.length != 0, "gpkShare is empty");
        require(sslshData.polyDataPln.polyData.length != 0, "polyData is empty");

        require(sslshData.becauseSndr, "S because sender is not true");

        uint8 smIndex;
        //smIndex = sslshData.becauseSndr ? sslshData.sndrIndex : sslshData.rcvrIndex;
        smIndex =  sslshData.sndrIndex;
        metricData.mapSSlsh[grpId][hashX][smIndex] = sslshData;

        if (checkSProof(metricData, grpId, hashX, smIndex)) {
            metricData.mapSlshCount[grpId][getEpochId(metricData)][smIndex] = metricData.mapSlshCount[grpId][getEpochId(metricData)][smIndex].add(uint(1));
            return (true, smIndex);
        } else {
            delete metricData.mapSSlsh[grpId][hashX][smIndex];

            return (false, smIndex);
        }
    }

    /// @notice                         check proof of S stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkSProof(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bool bSig = checkSSig(metricData, grpId, hashX, smIndex);
        bool bContent = checkSContent(metricData, grpId, hashX, smIndex);
        return getChkResult(bSig, bContent);
    }
    /// @notice                         check signature of proof in S stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkSSig(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bytes32 h;
        bytes memory senderPk;

        MetricTypes.SSlshData memory sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(sslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(metricData, grpId, sslshData.sndrIndex);

        return ckSig(metricData, h, sslshData.polyDataPln.polyDataR, sslshData.polyDataPln.polyDataS, senderPk);
    }

    function ckSig(MetricTypes.MetricStorageData storage metricData, bytes32 hash, bytes32 r, bytes32 s, bytes memory pk)
    internal
    returns (bool){
        address curveAddr;
        curveAddr = IConfig(metricData.config).getCurve(uint8(CommonTool.CurveType.SK));
        return ICurve(curveAddr).checkSig(hash, r, s, pk);
    }

    /// @notice                         check content of proof in S stage
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param hashX                    hash of the signed data
    /// @param smIndex                  index of store man
    function checkSContent(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
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
        address curveAddr;
        curveAddr = IConfig(metricData.config).getCurve(uint8(sslshData.curveType));

        uint16 ployDataLen = uint16(sslshData.polyDataPln.polyData.length);
        (xRight, yRight, success) = ICurve(curveAddr).mulG(CommonTool.bytes2uint(sslshData.polyDataPln.polyData, 0,ployDataLen));
        require(success, 'mulG fail');

        // rpkShare + m * gpkShare
        (mgpkX, mgpkY, success) = ICurve(curveAddr).mulPk(CommonTool.bytes2uint(sslshData.m, 0, uint16(sslshData.m.length)),
            CommonTool.bytes2uint(sslshData.gpkShare, 0, 32),
            CommonTool.bytes2uint(sslshData.gpkShare, 32, 32));
        require(success, 'mulPk fail');

        (xLeft, yLeft, success) = ICurve(curveAddr).add(CommonTool.bytes2uint(sslshData.rpkShare, 0, 32),
            CommonTool.bytes2uint(sslshData.rpkShare, 32, 32),
            mgpkX,
            mgpkY);
        require(success, 'add fail');
        return ICurve(curveAddr).equalPt(xLeft,yLeft,yLeft,yRight);
    }
    /// @notice                         get public key bytes by stor eman index
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param smIndex                  index of store man
    function getPkBytesByInx(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, uint8 smIndex)
    internal
    view
    returns (bytes memory)
    {
        bytes memory smPk;
        (, smPk,) = (IStoremanGroup)(metricData.smg).getSelectedSmInfo(grpId, uint(smIndex));
        return smPk;
    }
    /// @notice                         get epoch id by now time stamp
    /// @param metricData               self parameter for lib function
    function getEpochId(MetricTypes.MetricStorageData storage metricData)
    internal
    view
    returns (uint)
    {
        return IPosLib(metricData.posLib).getEpochId(block.timestamp);
    }
    /// @notice                         get total number of store man in special group
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    function getSMCount(MetricTypes.MetricStorageData storage metricData, bytes32 grpId)
    public
    view
    returns (uint8)
    {
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        return uint8(smgTemp.getSelectedSmNumber(grpId));
    }
    /// @notice                         get leader address of the group
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    function getLeader(MetricTypes.MetricStorageData storage metricData, bytes32 grpId)
    public
    view
    returns (address)
    {
        address leader;
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        (leader,,) = smgTemp.getSelectedSmInfo(grpId, uint(0));
        return leader;
    }

    /// @notice                         get work address of the group
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param smIndex                  sm index
    function getWkAddr(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, uint smIndex)
    public
    view
    returns (address)
    {
        address wkAddr;
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        (wkAddr,,) = smgTemp.getSelectedSmInfo(grpId, smIndex);
        return wkAddr;
    }

    /// @notice                         record sm slash
    /// @param metricData               self parameter for lib function
    /// @param grpId                    group id
    /// @param smIndex                  sm index
    function recordSmSlash(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, uint smIndex)
    public
    view
    {
        address wkAddr;
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        wkAddr = getWkAddr(metricData, grpId, smIndex);
        smgTemp.recordSmSlash(wkAddr);
    }
}
