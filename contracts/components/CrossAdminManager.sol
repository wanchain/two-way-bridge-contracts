// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Structure for setting cross-chain fees
 * 
 * @param srcChainID Source chain identifier
 * @param destChainID Destination chain identifier
 * @param contractFee Fee for contract operations
 * @param agentFee Fee for agent operations
 * 
 * @custom:usage
 * - Used in cross-chain fee management
 * - Supports multiple chain pairs
 * - Handles different fee types
 */
struct SetFeesParam {
    uint256 srcChainID;
    uint256 destChainID;
    uint256 contractFee;
    uint256 agentFee;
}

/**
 * @dev Interface for cross-chain proxy operations
 * 
 * @custom:usage
 * - Defines cross-chain fee setting functionality
 * - Used for proxy contract interactions
 */
interface ICrossProxy {
    function setFees(SetFeesParam [] calldata params) external;
}

/**
 * @title CrossAdminManager
 * @dev Contract for managing cross-chain administrative operations
 * This contract provides functionality for managing cross-chain fees
 * and administrative operations with role-based access control
 * 
 * Key features:
 * - Cross-chain fee management
 * - Role-based access control
 * - Administrative operations
 * - Fallback functionality
 * 
 * @custom:security
 * - Inherits OpenZeppelin's AccessControl
 * - Role-based permissions
 * - Controlled access to cross-chain operations
 */
contract CrossAdminManager is AccessControl {
    // Address of the cross-chain contract
    address crossSC;

    /**
     * @dev Role identifier for operator permissions
     * 
     * @custom:usage
     * - Used for operator role assignment
     * - Controls operator access rights
     */
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /**
     * @dev Modifier to restrict function access to admin and operator roles
     * 
     * @custom:requirements
     * - Caller must have admin or operator role
     * 
     * @custom:reverts
     * - If caller has neither admin nor operator role
     */
    modifier onlyAdminAndOperator() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(OPERATOR_ROLE, msg.sender), "CrossAdminManager: caller is not admin or operator");
        _;
    }

    /**
     * @dev Constructor initializes the contract with admin, operator, and cross-chain addresses
     * 
     * @param admin Address of the admin role holder
     * @param operator Address of the operator role holder
     * @param _cross Address of the cross-chain contract
     * 
     * @custom:effects
     * - Sets up admin role
     * - Sets up operator role
     * - Initializes cross-chain contract address
     */
    constructor(address admin, address operator, address _cross) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(OPERATOR_ROLE, operator);
        crossSC = _cross;
    }

    /**
     * @dev Sets fees for cross-chain operations
     * 
     * @param params Array of fee parameters for different chain pairs
     * 
     * @custom:requirements
     * - Caller must have admin or operator role
     * 
     * @custom:effects
     * - Updates fees in cross-chain contract
     * - Supports multiple chain pairs
     */
    function setFees(SetFeesParam [] calldata params) public onlyAdminAndOperator {
        ICrossProxy(crossSC).setFees(params);
    }

    /**
     * @dev Fallback function for handling unknown function calls
     * 
     * @custom:requirements
     * - Caller must have admin role
     * 
     * @custom:effects
     * - Forwards calls to cross-chain contract
     * - Requires successful execution
     * 
     * @custom:reverts
     * - If call to cross-chain contract fails
     */
    fallback() external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool success, ) = crossSC.call(msg.data);
        require(success, "CrossAdminManager: fallback call failed");
    }
}
