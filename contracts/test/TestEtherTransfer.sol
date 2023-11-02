// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../crossApproach/lib/EtherTransfer.sol";

contract TestEtherTransfer {
    bool public acceptable;

    function sendValue(address payable recipient, uint256 amount, uint256 gasLimit)
        external
    {
        EtherTransfer.sendValue(recipient, amount, gasLimit);
    }

    function setAcceptable(bool input) external {
        acceptable = input;
    }

    fallback() external payable {
        require(acceptable, "not support");
    }
    receive() external payable {
        require(acceptable, "not support");
    }
}