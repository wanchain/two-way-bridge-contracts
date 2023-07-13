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
pragma abicoder v2;

import "../components/Halt.sol";
import "../components/Admin.sol";
import "./ConfigStorage.sol";


contract ConfigDelegate is Halt , Admin, ConfigStorage{

    /// @notice                           function for set smg contract address
    /// @param curveId                    curve id array
    /// @param curveAddress               curve contract address array
    function setCurve(uint8[] calldata curveId, address[] calldata curveAddress)
    external
    onlyAdmin
    {
        uint8 length = uint8(curveId.length);
        require((length > 0) && (length == curveAddress.length), "Mismatched length");
        for (uint8 i = 0; i < length; i++) {
            curves[curveId[i]] = curveAddress[i];
        }
    }

    function getCurve(uint8 curveId)
    external
    view
    returns(address){
        require(curves[curveId] != address(0), "No curve");
        return curves[curveId];
    }

    receive() external payable {
        revert("Not support");
    }

}
