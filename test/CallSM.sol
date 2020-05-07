pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/test/TestStoremanGroup.sol";

contract CallSM {
    uint total = 1;
    uint total2 ;
    //address tsmg = address(0x82Ee15a21e8a584aF87EdDC9f32E22F1Ca22f37b);
    address tsmg = DeployedAddresses.TestStoremanGroup();
    TestStoremanGroup sm = TestStoremanGroup(tsmg);
    uint[] tt ;

   constructor(){
       total2 = 2;
    }
    function test1() public{
        tt.push(1);
        tt.push(2);
        Assert.equal(tt[0], 1, "1");
        Assert.equal(tt[1], 2, "2");

    }
    function test2() public {
        address addr1 = address(0x011111);
        address addr2 = address(0x022222);

        uint[] memory types = new uint[](2);
        types[0] = 10;
        types[1] = 20;

        address[] memory addrs = new address[](2);
        addrs[0] = addr1;
        addrs[1] = addr2;
        Assert.equal(types[0], 10, "types 1");
        Assert.equal(types[1], 20, "types 2");
        
        sm.testArray(types,addrs);


        address a = sm.badAddrs(0);
        address b = sm.badAddrs(1);

        Assert.equal(addr1, a, "set bad address 1 failed");
        Assert.equal(addr2, b, "set bad address 2 failed");


        uint t1 = sm.badTypes(0);
        uint t2 = sm.badTypes(1);

        Assert.equal(t1, types[0], "t1 ");
        Assert.equal(t2, types[1],  "t2");
    }
}