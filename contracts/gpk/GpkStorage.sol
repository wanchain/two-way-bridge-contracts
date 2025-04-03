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

pragma solidity ^0.8.18;

import "../components/BasicStorage.sol";
import "./lib/GpkTypes.sol";

/**
 * @title GpkStorage
 * @dev Storage contract for Group Public Key (GPK) functionality
 * This contract serves as the storage layer for the GPK system, inheriting from BasicStorage
 * and providing storage for group-related data and configuration
 */
contract GpkStorage is BasicStorage {
    /// @notice Address of the Storeman Group (SMG) instance
    address public smg;

    /// @notice Address of the GPK configuration contract
    address public cfg;

    /// @notice Mapping from group ID to Group structure
    /// @dev Stores all group-related information indexed by their unique identifiers
    mapping(bytes32 => GpkTypes.Group) public groupMap;
}