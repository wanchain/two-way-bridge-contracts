// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";

struct SetFeesParam {
    uint256 srcChainID;
    uint256 destChainID;
    uint256 contractFee;
    uint256 agentFee;
}

interface ICrossProxy {
    function setFees(SetFeesParam [] calldata params) external;
}

contract CrossAdminManager is AccessControl {
    address crossSC; // cross chain contract address

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    modifier onlyAdminAndOperator() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(OPERATOR_ROLE, msg.sender), "CrossAdminManager: caller is not admin or operator");
        _;
    }

    constructor(address admin, address operator, address _cross) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(OPERATOR_ROLE, operator);
        crossSC = _cross;
    }

    function setFees(SetFeesParam [] calldata params) public onlyAdminAndOperator {
        ICrossProxy(crossSC).setFees(params);
    }

    fallback() external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool success, ) = crossSC.call(msg.data);
        require(success, "Call failed");
    }
}
