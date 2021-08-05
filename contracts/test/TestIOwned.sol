
// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface TestIOwned {
    function changeOwner(address _newOwner) external;
    function acceptOwnership() external;
}
