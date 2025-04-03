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

/**
 * Math operations with safety checks
 */

import "../components/Admin.sol";
import "./TokenManagerStorage.sol";
import "../components/Proxy.sol";

/**
 * @title TokenManagerProxy
 * @dev Proxy contract for token management functionality
 * This contract provides:
 * - Upgradeable implementation for token management
 * - Storage and admin functionality inheritance
 * - Implementation upgrade mechanism
 */
contract TokenManagerProxy is TokenManagerStorage, Admin, Proxy {
    /**
    *
    * MANIPULATIONS
    *
    */

    /**
     * @notice Upgrades the implementation address of the TokenManagerDelegate contract
     * @dev Can only be called by the contract owner
     * @param impl Address of the new TokenManagerDelegate implementation
     * Requirements:
     * - Implementation address cannot be zero
     * - Implementation address cannot be the same as current
     * Emits:
     * - Upgraded event with the new implementation address
     */
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}