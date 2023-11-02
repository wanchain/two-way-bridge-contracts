// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../crossApproach/lib/CrossTypes.sol";

contract TestTransfer {

    function balanceOf(address) pure external returns (uint256) {
        return 1;
    }

    function transfer(address tokenScAddr, address to, uint value)
        external
        returns(bool)
    {
        return CrossTypes.transfer(tokenScAddr, to, value);
    }

    function transferFrom(address tokenScAddr, address from, address to, uint value)
        external
        returns(bool)
    {
        return CrossTypes.transferFrom(tokenScAddr, from, to, value);
    }
}