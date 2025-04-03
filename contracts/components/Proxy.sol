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
 * @title Proxy
 * @dev Base contract for proxy pattern implementation
 * This contract provides functionality for delegating calls to implementation contracts
 * and supports contract upgradeability
 * 
 * Key features:
 * - Implementation contract delegation
 * - Contract upgrade support
 * - Fallback handling
 * - Receive function support
 * 
 * @custom:security
 * - Implementation address validation
 * - Safe delegatecall execution
 * - Proper return data handling
 */
contract Proxy {

    /**
     * @dev Emitted when the implementation contract is upgraded
     * 
     * @param implementation Address of the new implementation contract
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Internal storage for implementation contract address
     * 
     * @custom:usage
     * - Stores current implementation address
     * - Used for delegatecall operations
     * - Modified through upgrade operations
     */
    address internal _implementation;

    /**
     * @dev Returns the current implementation contract address
     * 
     * @return Address of the current implementation contract
     */
    function implementation() public view returns (address) {
        return _implementation;
    }

    /**
     * @dev Internal function to handle fallback calls
     * Delegates all calls to the implementation contract
     * 
     * @custom:requirements
     * - Implementation contract must be set
     * 
     * @custom:effects
     * - Executes delegatecall to implementation
     * - Handles return data
     * 
     * @custom:reverts
     * - If implementation contract is not set
     * - If delegatecall fails
     */
    function _fallback() internal {
        address _impl = _implementation;
        require(_impl != address(0), "implementation contract not set");

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), _impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    /**
     * @dev Fallback function to handle unknown function calls
     * Delegates all calls to the implementation contract
     * 
     * @custom:effects
     * - Forwards call to _fallback
     */
    fallback() external payable {
        return _fallback();
    }

    /**
     * @dev Receive function to handle incoming ETH
     * Delegates all calls to the implementation contract
     * 
     * @custom:effects
     * - Forwards call to _fallback
     */
    receive() external payable {
        return _fallback();
    }
}
