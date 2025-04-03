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

pragma solidity 0.8.18;
pragma experimental ABIEncoderV2;

/**
 * Math operations with safety checks
 */

import "../components/Halt.sol";
import "../components/Admin.sol";
import "./MetricStorage.sol";
import "../components/Proxy.sol";

/**
 * @title MetricProxy
 * @dev Proxy contract for metric system
 * This contract implements the upgradeable pattern for the metric system
 * and provides administrative controls for contract upgrades
 */
contract MetricProxy is MetricStorage, Halt, Proxy {

    /**
     * @notice Updates the implementation address of the MetricDelegate contract
     * @dev Only callable by the contract owner
     * @param impl The address of the new MetricDelegate contract
     * @dev Throws if the new implementation address is invalid or the same as current
     * @dev Emits Upgraded event on successful upgrade
     */
    ///@dev                   update the address of MetricDelegate contract
    ///@param impl            the address of the new MetricDelegate contract
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}