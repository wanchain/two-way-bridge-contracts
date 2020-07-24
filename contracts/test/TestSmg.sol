pragma solidity ^0.4.24;

import "../interfaces/IStoremanGroup.sol";

contract TestSmg {
    IStoremanGroup smg;
    constructor(){
        return;
    }
    function setSmgAddr(address addr) public{
        smg = IStoremanGroup(addr);
    }
    function testSetGpk(bytes32 groupId, bytes gpk, bytes gpk1) public {
        smg.setGpk(groupId, gpk, gpk1);
    }
}
