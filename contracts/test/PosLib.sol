// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
import "../lib/SafeMath.sol";


library PosLib {
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    function getEpochId(uint256 blockTime) public pure returns (uint256) {
        return blockTime/120;
    }

    function getMinIncentive (uint256 smgDeposit,uint256 targetSecond) public pure returns(uint256) {
        return 30000000;
    }
}
