// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


library FakePosLib {
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

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
