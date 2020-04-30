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
import "./lib/MetricLib.sol";

contract MetricDelegate is MetricStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * MODIFIERS
     *
     */


    /**
     *
     * MANIPULATIONS
     *
     */

    function getPrdInctMetric(bytes grpId,uint256 startEpId, uint256 endEpId)
    external
    initialized
    notHalted
    {

    }

    function getPrdSlshMetric(bytes grpId,uint256 startEpId, uint256 endEpId)
    external
    initialized
    notHalted
    {

    }

    function getSmSuccCntByEpId(bytes grpId,uint256 epId,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function getSmRSlshCntByEpId(bytes grpId,uint256 epId,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function getSmRNWCntByEpId(bytes grpId,uint256 epId,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function getSmSSlshCntByEpId(bytes grpId,uint256 epId,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function getSmSNWCntByEpId(bytes grpId,uint256 epId,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function getRSlshProof(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function getSSlshProof(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function wrInct(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function wrRSlsh(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function wrRNW(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function wrSSlsh(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function wrSNW(bytes32 xHash)
    external
    initialized
    notHalted
    {

    }

    function checkRProof(bytes grpId,bytes32 hashX,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }

    function checkSProof(bytes grpId,bytes32 hashX,uint8 smIndex)
    external
    initialized
    notHalted
    {

    }
}
