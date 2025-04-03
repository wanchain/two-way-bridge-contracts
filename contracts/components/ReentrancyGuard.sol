// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title ReentrancyGuard
 * @dev Abstract contract module that helps prevent reentrant calls to a function
 *
 * Key features:
 * - Prevents reentrant function calls
 * - Gas optimization for refunds
 * - Support for nested function protection
 *
 * @custom:security
 * - Prevents reentrancy attacks
 * - Optimizes gas refunds
 * - Supports private function calls
 * 
 * @custom:usage
 * - Inherit this contract to use nonReentrant modifier
 * - Apply nonReentrant modifier to functions that need protection
 * - Use private functions for nested calls
 */
abstract contract ReentrancyGuard {
    /**
     * @dev Private state variable to track reentrancy status
     * 
     * @custom:usage
     * - true: Function can be entered
     * - false: Function is currently executing
     * 
     * @custom:security
     * - Prevents reentrant calls
     * - Optimizes gas refunds
     */
    bool private _notEntered;

    /**
     * @dev Constructor initializes the reentrancy guard
     * 
     * @custom:effects
     * - Sets initial state to true
     * - Optimizes gas refunds
     * 
     * @custom:security
     * - Ensures proper initialization
     * - Prevents initial reentrancy
     */
    constructor () {
        // Storing an initial non-zero value makes deployment a bit more
        // expensive, but in exchange the refund on every call to nonReentrant
        // will be lower in amount. Since refunds are capped to a percetange of
        // the total transaction's gas, it is best to keep them low in cases
        // like this one, to increase the likelihood of the full refund coming
        // into effect.
        _notEntered = true;
    }

    /**
     * @dev Modifier to prevent reentrant calls to a function
     * 
     * @custom:requirements
     * - Function must not be currently executing
     * 
     * @custom:effects
     * - Sets _notEntered to false during execution
     * - Restores _notEntered to true after execution
     * 
     * @custom:reverts
     * - If function is already executing
     * 
     * @custom:usage
     * - Apply to functions that need reentrancy protection
     * - Use with private functions for nested calls
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_notEntered, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _notEntered = false;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _notEntered = true;
    }
}
