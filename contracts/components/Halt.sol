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

pragma solidity ^0.8.18;
import './Owned.sol';

/**
 * @title Halt
 * @dev Contract for emergency stop functionality
 * This contract provides functionality to halt and resume contract operations
 * in emergency situations
 * 
 * Key features:
 * - Emergency stop mechanism
 * - Access control through ownership
 * - Modifiers for halted state checks
 * 
 * @custom:security
 * - Inherits Owned contract for ownership management
 * - Only owner can halt/resume operations
 * - State checks through modifiers
 */
contract Halt is Owned {

    /**
     * @dev Public state variable indicating if contract is halted
     * 
     * @custom:usage
     * - Controls contract operation state
     * - Accessible for external queries
     * - Modified through setHalt function
     */
    bool public halted = false;

    /**
     * @dev Modifier to ensure contract is not halted
     * 
     * @custom:requirements
     * - Contract must not be in halted state
     * 
     * @custom:reverts
     * - If contract is halted
     */
    modifier notHalted() {
        require(!halted, "Smart contract is halted");
        _;
    }

    /**
     * @dev Modifier to ensure contract is halted
     * 
     * @custom:requirements
     * - Contract must be in halted state
     * 
     * @custom:reverts
     * - If contract is not halted
     */
    modifier isHalted() {
        require(halted, "Smart contract is not halted");
        _;
    }

    /**
     * @dev Sets the halted state of the contract
     * 
     * @param halt Boolean indicating desired halted state
     * 
     * @custom:requirements
     * - Caller must be the contract owner
     * 
     * @custom:effects
     * - Updates halted state
     * - Controls contract operation availability
     */
    function setHalt(bool halt)
        public
        onlyOwner
    {
        halted = halt;
    }
}