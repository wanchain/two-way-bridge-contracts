pragma solidity 0.4.26;

interface IPosLib {
    function getEpochId(uint256 blockTime) public view returns (uint256);

    function getMinIncentive(uint256 smgDeposit, uint256 targetSecond) public view returns (uint256);
}