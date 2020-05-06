pragma solidity ^0.4.24;

import "truffle/Assert.sol";

contract CallSM {
    uint total = 1;
    constructor(){
        uint total2 = 2;
    }
    function test1(){
        uint a = total;
        Assert(a, 1, "total should be 1");
    }
    function test2(){
        uint b = total2;
        Assert(b, 2, "total2 should be 2");
    }
}