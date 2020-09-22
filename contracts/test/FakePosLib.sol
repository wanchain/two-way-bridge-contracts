pragma solidity ^0.4.26;
import "../lib/SafeMath.sol";


library FakePosLib {
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function getEpochId(uint256 blockTime) public view returns (uint256) {
        return blockTime/1;
    }

    function getMinIncentive (uint256 smgDeposit,uint256 targetSecond, uint256 totalDeposit) public view returns(uint256) {
        return 30000000;
    }
}
