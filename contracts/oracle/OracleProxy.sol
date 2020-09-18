pragma solidity 0.4.26;
import "../components/Owned.sol";
import "./OracleStorage.sol";
import "../components/Proxy.sol";

contract OracleProxy is OracleStorage, Owned, Proxy {
    function upgradeTo(address impl) public onlyOwner {
        require(impl != address(0), "Cannot upgrade to invalid address");
        require(impl != _implementation, "Cannot upgrade to the same implementation");
        _implementation = impl;
        emit Upgraded(impl);
    }
}