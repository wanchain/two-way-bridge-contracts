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

import "../components/Admin.sol";
import "./GpkStorage.sol";
import "../components/Proxy.sol";

/**
 * @title GpkProxy
 * @dev Proxy contract for Group Public Key (GPK) functionality
 * This contract implements the proxy pattern for upgradeable GPK contracts,
 * allowing the implementation to be upgraded while maintaining the same storage
 */
contract GpkProxy is GpkStorage, Admin, Proxy {
    /**
     * @dev Contract upgrade functionality
    */

    /**
     * @notice Upgrades the GPK implementation to a new version
     * @dev Only callable by the contract owner
     * @param impl The address of the new GpkDelegate contract implementation
     * @dev Throws if the new implementation address is invalid or the same as current
     * @dev Emits an Upgraded event on successful upgrade
     */
    function upgradeTo(address impl) external onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}