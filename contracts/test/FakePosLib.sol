pragma solidity ^0.4.26;
import 'openzeppelin-eth/contracts/math/SafeMath.sol';


library FakePosLib {
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function getEpochId(uint256 blockTime) public pure returns (uint256) {
        return blockTime/1;
    }

    function getMinIncentive (uint256 smgDeposit,uint256 targetSecond, uint256 totalDeposit) public pure returns(uint256) {
        uint posCap = 60000000000;
        if(totalDeposit < posCap) return 30000000;
        uint cap = posCap.mul(smgDeposit).div(totalDeposit);
        return cap > 30000000 ? 30000000 : cap;
    }
}
