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
import "../components/Owned.sol";
import "./OracleStorage.sol";
import "../components/Proxy.sol";

/**
 * @title OracleProxy
 * @dev Proxy contract for Oracle functionality
 * This contract provides:
 * - Upgradeable implementation
 * - Storage management
 * - Ownership control
 */
contract OracleProxy is OracleStorage, Owned, Proxy {
    /**
     * @notice Upgrades the OracleDelegate implementation
     * @dev Can only be called by the contract owner
     * @param impl Address of the new OracleDelegate contract
     * Requirements:
     * - New implementation address cannot be zero
     * - New implementation address must be different from current
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