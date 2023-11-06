// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../crossApproach/CrossDelegateV4.sol";

contract FakeCrossDelegate is CrossDelegateV4 {
    function renounceOwner() external {
        owner = address(0);
    }

    function setStoremanFee(bytes32 groupID) payable external {
        storageData.mapStoremanFee[groupID] = msg.value;
    }
}
