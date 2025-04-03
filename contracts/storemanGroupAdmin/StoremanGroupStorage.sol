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
import "../interfaces/IMetric.sol";
import "./Deposit.sol";
import "./StoremanType.sol";
import "../interfaces/IQuota.sol";

/**
 * @title StoremanGroupStorage
 * @dev Contract for managing storage of storeman group data and configurations
 * This contract inherits from BasicStorage and provides storage functionality
 * for storeman group management
 * 
 * Key features:
 * - Storeman data storage
 * - Configuration management
 * - Metric and quota integration
 * - Default parameter initialization
 * 
 * @custom:security
 * - Inherits BasicStorage security features
 * - Access control through BasicStorage
 * - Safe storage operations
 */
contract StoremanGroupStorage is BasicStorage {
  // Address of the metric contract for performance tracking
  address public metric;

  // Instance of the quota contract for managing quotas
  IQuota public quotaInst;

  // Address for creating group public key
  address public createGpkAddr;

  // Main storage structure for storeman data
  StoremanType.StoremanData data;

  /**
   * @dev Constructor initializes default configuration values
   * 
   * @custom:effects
   * - Sets default backup count to 3
   * - Sets default max slashed count to 2
   * - Sets default standalone weight to 15000
   * - Sets default chain type coefficient to 10000
   * - Sets default delegation multiplier to 5
   * 
   * @custom:initialization
   * - Initializes all configuration parameters
   * - Sets up default values for storeman group management
   */
  constructor() {
    uint backupCountDefault = 3;
    uint maxSlashedCount = 2;
    uint standaloneWeightDefault = 15000;
    uint chainTypeCoDefault = 10000;
    uint DelegationMultiDefault = 5;

    data.conf.standaloneWeight = standaloneWeightDefault;
    data.conf.backupCount = backupCountDefault;
    data.conf.chainTypeCoDefault = chainTypeCoDefault;
    data.conf.maxSlashedCount = maxSlashedCount;
    data.conf.DelegationMulti = DelegationMultiDefault;
  }
}
