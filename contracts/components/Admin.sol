// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./Owned.sol";

/**
 * @title Admin
 * @dev Contract for managing administrative access control
 * This contract provides functionality for managing admin addresses
 * and controlling access to administrative functions
 * 
 * Key features:
 * - Admin address management
 * - Access control through modifiers
 * - Admin addition and removal
 * 
 * @custom:security
 * - Inherits Owned contract for ownership management
 * - Only owner can add/remove admins
 * - Only admins can access protected functions
 */
contract Admin is Owned {
    /**
     * @dev Mapping of addresses to their admin status
     * 
     * @custom:usage
     * - Used to track admin addresses
     * - Provides quick lookup for admin status
     * - Supports admin access control
     */
    mapping(address => bool) public mapAdmin;

    /**
     * @dev Emitted when a new admin is added
     * 
     * @param admin The address of the newly added admin
     */
    event AddAdmin(address admin);

    /**
     * @dev Emitted when an admin is removed
     * 
     * @param admin The address of the removed admin
     */
    event RemoveAdmin(address admin);

    /**
     * @dev Modifier to restrict function access to admin addresses only
     * 
     * @custom:requirements
     * - Caller must be an admin
     * 
     * @custom:reverts
     * - If caller is not an admin
     */
    modifier onlyAdmin() {
        require(mapAdmin[msg.sender], "not admin");
        _;
    }

    /**
     * @dev Adds a new admin address
     * 
     * @param admin The address to be added as admin
     * 
     * @custom:requirements
     * - Caller must be the contract owner
     * 
     * @custom:effects
     * - Sets admin status for the address
     * - Emits AddAdmin event
     */
    function addAdmin(
        address admin
    )
        external
        onlyOwner
    {
        mapAdmin[admin] = true;

        emit AddAdmin(admin);
    }

    /**
     * @dev Removes an admin address
     * 
     * @param admin The address to be removed from admin status
     * 
     * @custom:requirements
     * - Caller must be the contract owner
     * 
     * @custom:effects
     * - Removes admin status for the address
     * - Emits RemoveAdmin event
     */
    function removeAdmin(
        address admin
    )
        external
        onlyOwner
    {
        delete mapAdmin[admin];

        emit RemoveAdmin(admin);
    }
}