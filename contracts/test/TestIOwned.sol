// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;

interface TestIOwned {
    function changeOwner(address _newOwner) external;
    function acceptOwnership() external;
}
