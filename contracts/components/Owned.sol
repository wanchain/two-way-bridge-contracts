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

/**
 * @title Owned
 * @dev Base contract for ownership management
 * This contract provides functionality for managing contract ownership
 * with support for ownership transfer and renunciation
 * 
 * Key features:
 * - Ownership assignment
 * - Ownership transfer
 * - Ownership renunciation
 * - Two-step ownership transfer
 * 
 * @custom:security
 * - Owner-only access control
 * - Safe ownership transfer
 * - Ownership renunciation capability
 */
contract Owned {

    /**
     * @dev Emitted when ownership is transferred
     * 
     * @param previousOwner Address of the previous owner
     * @param newOwner Address of the new owner
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Modifier to restrict function access to owner only
     * 
     * @custom:requirements
     * - Caller must be the contract owner
     * 
     * @custom:reverts
     * - If caller is not the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Public state variable for contract owner
     * 
     * @custom:usage
     * - Stores current owner address
     * - Accessible for external queries
     * - Modified through ownership functions
     */
    address public owner;

    /**
     * @dev Constructor assigns initial owner
     * 
     * @custom:effects
     * - Sets initial owner to contract deployer
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Public state variable for pending owner
     * 
     * @custom:usage
     * - Stores address of pending owner
     * - Used in two-step ownership transfer
     */
    address public newOwner;

    /**
     * @dev Transfers ownership to a new address
     * 
     * @param _newOwner Address of the new owner
     * 
     * @custom:requirements
     * - Caller must be the current owner
     * - New owner address must not be zero
     * 
     * @custom:effects
     * - Updates owner address
     * - Emits OwnershipTransferred event
     */
    function transferOwner(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @dev Initiates two-step ownership transfer
     * 
     * @param _newOwner Address of the new owner
     * 
     * @custom:requirements
     * - Caller must be the current owner
     * 
     * @custom:effects
     * - Sets pending owner address
     */
    function changeOwner(address _newOwner) public onlyOwner {
        newOwner = _newOwner;
    }

    /**
     * @dev Accepts pending ownership transfer
     * 
     * @custom:requirements
     * - Caller must be the pending owner
     * 
     * @custom:effects
     * - Updates owner address to pending owner
     */
    function acceptOwnership() public {
        if (msg.sender == newOwner) {
            owner = newOwner;
        }
    }

    /**
     * @dev Renounces ownership of the contract
     * 
     * @custom:requirements
     * - Caller must be the current owner
     * 
     * @custom:effects
     * - Sets owner to zero address
     * - Makes contract unowned
     */
    function renounceOwnership() public onlyOwner {
        owner = address(0);
    }
}
