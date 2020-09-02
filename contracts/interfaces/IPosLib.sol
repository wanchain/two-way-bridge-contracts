// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

interface IPosLib {
    function getEpochId(uint256 blockTime) external view returns (uint256);

    function getMinIncentive(uint256 smgDeposit, uint256 targetSecond) external view returns (uint256);
}