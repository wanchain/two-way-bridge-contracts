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
import "./GpkStorage.sol";
import "../components/Admin.sol";
import "../components/Proxy.sol";

/**
 * @title GpkStorageV2
 * @dev Extended storage contract for Group Public Key (GPK) functionality
 * This contract extends GpkStorage with additional storage for multiple GPK configurations
 * per group, including curve and algorithm information
 */
contract GpkStorageV2 is GpkStorage, Admin, Proxy {
    /// @notice Mapping from group ID to the number of GPK configurations
    /// @dev Tracks how many different GPK configurations exist for each group
    mapping(bytes32=>uint) public gpkCount;

    /// @notice Mapping from group ID and GPK index to curve identifier
    /// @dev Stores the curve type for each GPK configuration
    mapping(bytes32=>mapping(uint=>uint)) public curve;

    /// @notice Mapping from group ID and GPK index to algorithm identifier
    /// @dev Stores the algorithm type for each GPK configuration
    mapping(bytes32=>mapping(uint=>uint)) public algo;
}