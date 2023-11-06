// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
contract FakeToken is ERC20Burnable, Ownable {
    address public pendingOwner;
    bool public invalidMode;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    function changeOwner(address _newOwner) external {
        pendingOwner = _newOwner;
    }

    function acceptOwnership() external {
        Ownable.transferOwnership(pendingOwner);
    }

    function burn(uint256 amount) public override {
        _burn(_msgSender(), amount);
    }

    function setTestInvalidMode(bool invalidMode_) external virtual {
        invalidMode = invalidMode_;
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (invalidMode) {
            return 210000000 ether;
        } else {
            return super.balanceOf(account);
        }
    }
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (invalidMode) {
            return true;
        } else {
            return super.transferFrom(from, to, amount);
        }
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (invalidMode) {
            return true;
        } else {
            return super.transfer(to, amount);
        }
    }
    function burn(address account_, uint256 value_)
        external
        virtual
    {
        if (!invalidMode) {
            _burn(account_, value_);
        }
    }

}