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
        require(mortgage != IMortage(address(0)), "Mortage is null");
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
        uint8 memory n = mortage.getTotalNumber(grpId);


        for (uint i = 0; i < n; i++) {
            ret.push(0);
            for (uint j = startEpId; j < startEpId; j++){
                ret[i] += mapInctCount[grpId][j][i];
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
        uint8 memory n = mortage.getTotalNumber(grpId);


        for (uint i = 0; i < n; i++) {
            ret.push(0);
            for (uint j = startEpId; j < startEpId; j++){
                ret[i] += mapSlshCount[grpId][j][i];
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
        return mapInctCount[grpId][epId][smIndex];
    }

    function getSlshCntByEpId(bytes grpId, uint epId, uint8 smIndex)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    returns (uint)
    {
        return mapSlshCount[grpId][epId][smIndex];
    }


    function getRSlshProof(bytes32 xHash)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function getSSlshProof(bytes32 xHash)
    external
    view
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function wrInct(bytes32 xHash)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }
///=======================================write incentive and slash=============================================
    function wrRSlsh(bytes32 xHash)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function wrRNW(bytes32 xHash)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function wrSSlsh(bytes32 xHash)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function wrSNW(bytes32 xHash)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }
///=======================================check proof =============================================
    function checkRProof(bytes grpId, bytes32 hashX, uint8 smIndex)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

    }

    function checkSProof(bytes grpId, bytes32 hashX, uint8 smIndex)
    external
    notHalted
    initialized
    onlyValidGrpId(grpId)
    {

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
}

