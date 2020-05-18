pragma solidity ^0.4.24;

import "../interfaces/IMortgage.sol";

contract TestSmg {
    IMortgage smg;
    constructor(){
        return;
    }
    function setSmgAddr(address addr) public{
        smg = IMortgage(addr);
    }
    function testSetGpk(bytes32 groupId, bytes gpk) public {
        smg.setGpk(groupId, gpk);
    }
}
