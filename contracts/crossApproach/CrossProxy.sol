
pragma solidity ^0.4.26;
import "../components/Proxy.sol";
import "../components/Halt.sol";
import "../components/ReentrancyGuard.sol";
import "./CrossStorage.sol";
contract CrossProxy is CrossStorage, ReentrancyGuard, Halt, Proxy {

    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}