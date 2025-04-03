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

import "../components/Proxy.sol";
import "../components/Halt.sol";
import "../components/ReentrancyGuard.sol";
import "./CrossStorage.sol";

/**
 * @title CrossProxy
 * @dev Proxy contract for cross-chain functionality that allows for implementation upgrades
 * This contract inherits from:
 * - CrossStorage: For storing cross-chain related data
 * - ReentrancyGuard: To prevent reentrancy attacks
 * - Halt: To provide emergency stop functionality
 * - Proxy: To enable implementation upgrades
 */
contract CrossProxy is CrossStorage, ReentrancyGuard, Halt, Proxy {

    /**
     * @dev Updates the implementation address of the CrossDelegate contract
     * @param impl The address of the new CrossDelegate contract implementation
     * Requirements:
     * - Caller must be the owner
     * - New implementation address cannot be zero
     * - New implementation address must be different from current implementation
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