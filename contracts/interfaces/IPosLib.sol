pragma solidity 0.4.26;

interface IPosLib {
    function getEpochId(uint256 blockTime) external view returns (uint256);

    function getMinIncentive(uint256 smgDeposit, uint256 day, uint256 totalDeposit) external view returns (uint256);
}
