// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import '../tokenManager/WrappedToken.sol';
contract FakeWrappedToken is WrappedToken {
    address public pendingOwner;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimal_
    ) WrappedToken(name_, symbol_, decimal_) {}

    function changeOwner(address _newOwner) external {
        pendingOwner = _newOwner;
    }

    function acceptOwnership() external {
        Ownable.transferOwnership(pendingOwner);
    }

    function burn(uint256 amount) public override {
        _burn(_msgSender(), amount);
    }
}