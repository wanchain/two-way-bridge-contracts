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
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity 0.8.18;

import "../components/Halt.sol";
import "../components/Admin.sol";
import "./StoremanGroupStorage.sol";
import "../components/Proxy.sol";
import "../components/ReentrancyGuard.sol";

/**
 * @title StoremanGroupProxy
 * @dev Proxy contract for storeman group administration
 * This contract implements the proxy pattern for the storeman group administration system,
 * allowing for upgradeable functionality while maintaining storage and address
 * 
 * Key features:
 * - Upgradeable implementation through proxy pattern
 * - Storage layout preservation
 * - Access control through Admin contract
 * - Emergency stop capability through Halt contract
 * 
 * @custom:inheritance
 * - StoremanGroupAdminStorage: Provides storage layout
 * - Halt: Provides emergency stop functionality
 * - Admin: Provides administrative access control
 * - Proxy: Implements upgradeable proxy pattern
 * 
 * @custom:security
 * - Access control through Admin contract
 * - Emergency stop capability through Halt contract
 * - Upgradeable through Proxy pattern
 * - Storage layout preservation
 * 
 * @custom:upgradeability
 * - Implementation can be upgraded without changing storage
 * - Storage layout is preserved across upgrades
 * - Upgrade process is controlled by admin
 */
contract StoremanGroupProxy is StoremanGroupStorage, Halt, Admin, ReentrancyGuard,Proxy {
    /**
    *
    * MANIPULATIONS
    *
    */

    /**
     * @dev Updates the implementation address of the StoremanGroupAdminDelegate contract
     * This function allows the admin to upgrade the implementation contract while
     * preserving the storage layout and contract address
     * 
     * @param implementation The new implementation address
     * 
     * @custom:requirements
     * - Caller must be the contract owner
     * - Implementation address must not be zero
     * - Implementation address must not be the current implementation
     * 
     * @custom:effects
     * - Updates the implementation address
     * - Emits Upgraded event
     * 
     * @custom:modifiers
     * - onlyOwner: Only contract owner can upgrade
     * 
     * @custom:reverts
     * - If implementation address is zero
     * - If implementation address is already set
     * 
     * @custom:examples
     * ```solidity
     * // Upgrade to new implementation
     * upgradeTo(newImplementation);
     * ```
     */
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}
