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

import "./CrossDelegateV5.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/**
 * @title CrossDelegateV6
 * @dev Enhanced version of CrossDelegateV6 that adds minimum cross-chain asset amount functionality
 * This contract extends CrossDelegateV5
 */
contract CrossDelegateV6 is CrossDelegateV5 {
    using EnumerableMap for EnumerableMap.UintToUintMap;

    /** STRUCT **/
    struct SetMinTokenPairCrossChainAmountParam {
        uint256 tokenPairID;
        uint256 minAmount;
    }

    /**
    * @dev Uses an EnumerableMap to store token pair IDs (uint256) mapped to their minimum cross-chain amounts (uint256).
    * This structure allows for efficient iteration over pairs (via .length() and .at(index)) and safe lookups (via .tryGet(key)).
    * Internal visibility ensures it's only accessible within the contract or derived contracts.
    * Emits events on set() operations if configured in the library.
    */
    EnumerableMap.UintToUintMap internal minTokenPairCrossChainAmount; // key: tokenPairID, value: min amount

    /** MODIFIERS **/
    /**
     * @notice Ensures the caller has admin privileges
     * @dev Checks if the caller is an admin, the main admin, or the owner
     */
    modifier checkCrossChainAmount(uint256 tokenPairID, uint256 crossChainAmount) {
        uint256 minAmount = getMinTokenPairCrossChainAmount(tokenPairID);
        require(crossChainAmount >= minAmount, "CrossDelegateV6: Amount below minimum");
        _;
    }

    /** EVENTS **/
    /**
     * @notice Emitted when a new minimum cross-chain asset value is set
     * @param tokenPairID ID of the token pair
     * @param minAmount The minimum cross-chain asset value
     */
    event SetMinTokenPairCrossChainAmount(uint256 tokenPairID, uint256 minAmount);

    /**
     *
     * MANIPULATIONS
     *
     */
    /**
     * @notice Initiates a cross-chain token transfer by locking original tokens
     * @dev This function handles the initial step of cross-chain transfer where original tokens are locked
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param userAccount Account information for receiving tokens on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Value must be greater than the minimum value
     * - Token pair must exist
     */
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
    public
    payable
    override
    checkCrossChainAmount(tokenPairID, value)
    {
        super.userLock(smgID, tokenPairID, value, userAccount);
    }

    /**
     * @notice Initiates a cross-chain token transfer by burning WRC20 tokens
     * @dev This function handles the initial step of cross-chain transfer where WRC20 tokens are burned
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param fee Fee for the transfer operation
     * @param tokenAccount Address of the token contract
     * @param userAccount Account information for receiving tokens on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Value must be greater than fee
     * - Token pair must exist
     * - Value must be greater than the minimum value
     */
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount)
    public
    payable
    override
    checkCrossChainAmount(tokenPairID, value)
    {
        super.userBurn(smgID, tokenPairID, value, fee, tokenAccount, userAccount);

    }

    /**
     * @notice Sets the minimum cross-chain transfer amounts for multiple token pairs.
     * @dev This function updates the minimum required amount for each token pair in the params array.
     * It iterates over the array and sets the value in the storage mapping.
     * Emits events for each update if configured in the storage structure.
     * @param params Array of SetMinTokenPairCrossChainAmountParam structs containing tokenPairID and minAmount.
     * @custom:requires Only callable by the operator (via onlyOperator modifier).
     */
    function setMinTokenPairCrossChainAmount(SetMinTokenPairCrossChainAmountParam[] calldata params) external virtual onlyOperator {
        for (uint256 i = 0; i < params.length; i++) {
            if (params[i].minAmount > 0) {
                minTokenPairCrossChainAmount.set(params[i].tokenPairID, params[i].minAmount);
            } else {
                minTokenPairCrossChainAmount.remove(params[i].tokenPairID);
            }
            emit SetMinTokenPairCrossChainAmount(params[i].tokenPairID, params[i].minAmount);
        }
    }

    /**
     * @notice Retrieves the total number of token pairs with configured minimum cross-chain amounts.
     * @dev Returns the length of the storage structure holding the token pair minimums.
     * Useful for pagination or checking the size of the configuration.
     * @return length The number of entries in the minTokenPairCrossChainAmount storage.
     */
    function getMinTokenPairCrossChainAmountLength() public view virtual returns (uint256 length) {
        length = minTokenPairCrossChainAmount.length();
    }

    /**
     * @notice Retrieves the minimum cross-chain amount for a token pair by its index in the storage.
     * @dev Fetches the tokenPairID and minAmount at the specified index.
     * Ensures the index is within bounds to prevent out-of-range errors.
     * @param index The index in the storage array/map.
     * @return tokenpairID The token pair ID at the given index.
     * @return minAmount The minimum cross-chain amount for that token pair.
     * @custom:requires Index must be less than the total length (reverts otherwise).
     */
    function getMinTokenPairCrossChainAmountByIndex(uint256 index) public view virtual returns (uint256 tokenpairID, uint256 minAmount) {
        uint256 length = getMinTokenPairCrossChainAmountLength();
        require(index < length, "Index out of bounds");
        (tokenpairID, minAmount) = minTokenPairCrossChainAmount.at(index);
    }

    /**
     * @notice Retrieves the minimum cross-chain amount for a specific token pair by ID.
     * @dev Attempts to fetch the minAmount for the given tokenPairID from storage.
     * If the pair is not configured, returns 0 (or handles default via tryGet).
     * @param tokenPairID The unique ID of the token pair.
     * @return minAmount The minimum cross-chain amount for the token pair (0 if not found).
     */
    function getMinTokenPairCrossChainAmount(uint256 tokenPairID) public view virtual returns (uint256 minAmount) {
        (, minAmount) = minTokenPairCrossChainAmount.tryGet(tokenPairID);
    }
}