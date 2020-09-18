
pragma solidity ^0.4.24;
import './Owned.sol';

contract Halt is Owned {

    bool public halted = false;

    modifier notHalted() {
        require(!halted, "Smart contract is halted");
        _;
    }

    modifier isHalted() {
        require(halted, "Smart contract is not halted");
        _;
    }

    function setHalt(bool halt)
        public
        onlyOwner
    {
        halted = halt;
    }
}