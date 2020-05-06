pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/test/TestStoremanGroup.sol";

contract CallSM {
    uint total = 1;
    uint total2 ;
   constructor(){
       total2 = 2;
    }
    function test1() public{
        address tsmg = address(0x82Ee15a21e8a584aF87EdDC9f32E22F1Ca22f37b);
        //address tsmg = DeployedAddresses.TestStoremanGroup();
        TestStoremanGroup sm = TestStoremanGroup(tsmg);
        uint bc = sm.getBackupCount();
        Assert.equal(bc,3,"bc should b 3");
        uint a = total;
        Assert.equal(a, 1, "total should be 1");
    }
    function test2() public {
        uint b = total2;
        Assert.equal(b, 2, "total2 should be 2");
    }
}