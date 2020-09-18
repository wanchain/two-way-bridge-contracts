
pragma solidity ^0.4.24;

import "../components/Halt.sol";
import "../components/Admin.sol";
import "./StoremanGroupStorage.sol";
import "../components/Proxy.sol";
import "../components/ReentrancyGuard.sol";

contract StoremanGroupProxy is StoremanGroupStorage, Halt, Admin, ReentrancyGuard,Proxy {
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}
