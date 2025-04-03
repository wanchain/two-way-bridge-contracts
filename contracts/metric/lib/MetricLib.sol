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

/**
 * @title MetricLib
 * @dev Library for handling metric-related operations in the Storeman system
 * This library provides functionality for managing and validating slash operations
 * in both R and S stages of the Storeman protocol
 */

library MetricLib {
    using SafeMath for uint;

    /**
     * @notice Writes and validates a slash operation for the R stage
     * @dev Processes R stage slash data and updates the metric storage
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param rslshData Slash data for R stage
     * @param smCount Total number of storeman nodes
     * @return bool Success status of the operation
     * @return uint8 Index of the storeman node
     */
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

    /**
     * @notice Validates the proof for R stage slash operation
     * @dev Checks both signature and content of the R stage proof
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Validation result
     */
    function checkRProof(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bool bSig = checkRSig(metricData, grpId, hashX, smIndex);
        bool bContent = checkRContent(metricData, grpId, hashX, smIndex);
        return getChkResult(bSig, bContent);
    }

    /**
     * @notice Validates the signature of R stage proof
     * @dev Verifies the cryptographic signature of the R stage proof
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Signature validation result
     */
    function checkRSig(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bytes32 h;
        bytes memory senderPk;

        MetricTypes.RSlshData storage rslshData = metricData.mapRSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(rslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(metricData, grpId, rslshData.sndrIndex);
        return ckSig(metricData,h, rslshData.polyDataPln.polyDataR, rslshData.polyDataPln.polyDataS, senderPk);
    }

    /**
     * @notice Validates the content of R stage proof
     * @dev Verifies the mathematical correctness of the R stage proof content
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Content validation result
     */
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

    /**
     * @notice Determines the final check result based on signature and content validation
     * @dev Combines signature and content validation results
     * @param bSig Signature validation result
     * @param bContent Content validation result
     * @return bool Final validation result
     */
    function getChkResult(bool bSig, bool bContent)
    internal
    pure
    returns (bool)
    {
        return !bSig || !bContent;
    }

    /**
     * @notice Writes and validates a slash operation for the S stage
     * @dev Processes S stage slash data and updates the metric storage
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param sslshData Slash data for S stage
     * @param smCount Total number of storeman nodes
     * @return bool Success status of the operation
     * @return uint8 Index of the storeman node
     */
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

    /**
     * @notice Validates the proof for S stage slash operation
     * @dev Checks both signature and content of the S stage proof
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Validation result
     */
    function checkSProof(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bool bSig = checkSSig(metricData, grpId, hashX, smIndex);
        bool bContent = checkSContent(metricData, grpId, hashX, smIndex);
        return getChkResult(bSig, bContent);
    }
    /**
     * @notice Validates the signature of S stage proof
     * @dev Verifies the cryptographic signature of the S stage proof
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Signature validation result
     */
    function checkSSig(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, bytes32 hashX, uint8 smIndex)
    internal
    returns (bool)
    {
        bytes32 h;
        bytes memory senderPk;

        MetricTypes.SSlshData storage sslshData = metricData.mapSSlsh[grpId][hashX][smIndex];
        // build h
        h = sha256(sslshData.polyDataPln.polyData);
        // build senderpk
        senderPk = getPkBytesByInx(metricData, grpId, sslshData.sndrIndex);

        return ckSig(metricData, h, sslshData.polyDataPln.polyDataR, sslshData.polyDataPln.polyDataS, senderPk);
    }

    /**
     * @notice Validates a cryptographic signature
     * @dev Checks if a signature is valid using the specified curve
     * @param metricData Storage data for metrics
     * @param hash Hash of the signed data
     * @param r First part of the signature
     * @param s Second part of the signature
     * @param pk Public key of the signer
     * @return bool Signature validation result
     */
    function ckSig(MetricTypes.MetricStorageData storage metricData, bytes32 hash, bytes32 r, bytes32 s, bytes memory pk)
    internal
    returns (bool){
        address curveAddr;
        curveAddr = IConfig(metricData.config).getCurve(uint8(CommonTool.CurveType.SK));
        return ICurve(curveAddr).checkSig(hash, r, s, pk);
    }

    /**
     * @notice Validates the content of S stage proof
     * @dev Verifies the mathematical correctness of the S stage proof content
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param hashX Hash of the signed data
     * @param smIndex Index of the storeman node
     * @return bool Content validation result
     */
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
    /**
     * @notice Retrieves public key bytes by storeman index
     * @dev Gets the public key of a storeman node by its index
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param smIndex Index of the storeman node
     * @return bytes Public key bytes
     */
    function getPkBytesByInx(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, uint8 smIndex)
    internal
    view
    returns (bytes memory)
    {
        bytes memory smPk;
        (, smPk,) = (IStoremanGroup)(metricData.smg).getSelectedSmInfo(grpId, uint(smIndex));
        return smPk;
    }
    /**
     * @notice Gets the current epoch ID based on timestamp
     * @dev Retrieves the epoch ID for the current block timestamp
     * @param metricData Storage data for metrics
     * @return uint Current epoch ID
     */
    function getEpochId(MetricTypes.MetricStorageData storage metricData)
    internal
    view
    returns (uint)
    {
        return IPosLib(metricData.posLib).getEpochId(block.timestamp);
    }
    /**
     * @notice Gets the total number of storeman nodes in a specific group
     * @dev Retrieves the count of selected storeman nodes in a group
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @return uint8 Number of storeman nodes
     */
    function getSMCount(MetricTypes.MetricStorageData storage metricData, bytes32 grpId)
    public
    view
    returns (uint8)
    {
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        return uint8(smgTemp.getSelectedSmNumber(grpId));
    }
    /**
     * @notice Gets the leader address of a group
     * @dev Retrieves the address of the leader node in a group
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @return address Leader node address
     */
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

    /**
     * @notice Gets the work address of a storeman node
     * @dev Retrieves the work address of a storeman node by its index
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param smIndex Index of the storeman node
     * @return address Work address of the node
     */
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

    /**
     * @notice Records a storeman slash event
     * @dev Records a slash event for a specific storeman node
     * @param metricData Storage data for metrics
     * @param grpId Group identifier
     * @param smIndex Index of the storeman node
     */
    function recordSmSlash(MetricTypes.MetricStorageData storage metricData, bytes32 grpId, uint smIndex)
    public
    {
        address wkAddr;
        IStoremanGroup smgTemp = IStoremanGroup(metricData.smg);
        wkAddr = getWkAddr(metricData, grpId, smIndex);
        smgTemp.recordSmSlash(wkAddr);
    }
}
