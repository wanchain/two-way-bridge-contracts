/*

  Copyright 2019 Wanchain Foundation.

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

pragma solidity ^0.4.25;

import "../components/BasicStorage.sol";
import "./lib/CrossTypesV1.sol";
import "./lib/HTLCTxLib.sol";
import "./lib/RapidityTxLib.sol";

contract CrossStorageV1 is BasicStorage {
    using HTLCTxLib for HTLCTxLib.Data;
    using RapidityTxLib for RapidityTxLib.Data;

    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    CrossTypesV1.Data internal storageData;

    /// @notice locked time(in seconds)
    uint public lockedTime = uint(3600*36);

    /// @notice Since storeman group admin receiver address may be changed, system should make sure the new address
    /// @notice can be used, and the old address can not be used. The solution is add timestamp.
    /// @notice unit: second
    uint public smgFeeReceiverTimeout = uint(10*60);

    enum GroupStatus { none, initial, curveSeted, failed, selected, ready, unregistered, dismissed }

}