
pragma solidity 0.4.26;
import "../components/Admin.sol";
import "./TokenManagerStorage.sol";
import "../components/Proxy.sol";

contract TokenManagerProxy is TokenManagerStorage, Admin, Proxy {
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}