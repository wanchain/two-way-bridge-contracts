// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IPosLib {
    function getEpochId(uint256 blockTime) external view returns (uint256);

    function getMinIncentive(uint256 smgDeposit, uint256 day, uint256 totalDeposit) external view returns (uint256);
}
