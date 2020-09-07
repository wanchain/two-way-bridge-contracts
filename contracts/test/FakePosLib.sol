pragma solidity ^0.4.26;

contract FakePosLib {
    function getEpochId(uint256 blockTime) public view returns (uint256) {
        return blockTime/120;
    }

    function getMinIncentive (uint256 smgDeposit,uint256 targetSecond) public view returns(uint256) {
        return 30000000;
    }
}
