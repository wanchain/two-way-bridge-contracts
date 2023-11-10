// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/ReentrancyGuard.sol";

contract FakeReentrancy is ReentrancyGuard {
    uint256 public counter;

    constructor() {
        counter = 0;
    }

    function countLocalRecursive(uint256 times) public nonReentrant {
        if (times > 0) {
            increase();
            countLocalRecursive(times - 1);
        }
    }

    function countThisRecursive(uint256 times) external nonReentrant {
        if (times > 0) {
            increase();
            (bool success, ) = address(this).call(abi.encodeWithSignature("countThisRecursive(uint256)", times - 1));
            require(success, "FakeReentrancy: failed call");
        }
    }

    function increase() private {
        counter += 1;
    }

}
