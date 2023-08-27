pragma solidity ^0.8.18

import "../interfaces/IMappingToken.sol";
import "../components/BasicStorage.sol";
import "./MappingNftToken.sol";
import "./TestIOwned.sol";

contract TestNftTokenCreator is BasicStorage {
    address _admin;

    modifier onlyAdmin {
        require(_admin != address(0), "admin is null");
        _;
    }

    function setAdmin(address admin) external {
        _admin = admin;
    }

    function getAdmin() external view returns (address) {
        return _admin;
    }

    function createToken(string tokenName, string tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = new MappingNftToken(tokenName, tokenSymbol);
        addressData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenInst);
        uintData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenDecimal);
        // TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function changeOwner(string tokenName, string tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function acceptOwnership(string tokenName, string tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).acceptOwnership();
    }

    function getTokenAddr(string tokenName, string tokenSymbol) external view returns (address) {
        return addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
    }

    function mintToken(string tokenName, string tokenSymbol, address to, uint value) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IMappingToken(tokenInst).mint(to, value);
    }

    function burnToken(string tokenName, string tokenSymbol, address from, uint value) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IMappingToken(tokenInst).burn(from, value);
    }

    function tokenBalance(string tokenName, string tokenSymbol, address owner) external view returns (uint balance) {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        balance = MappingNftToken(tokenInst).balanceOf(owner);
    }

    function getTokenDecimal(string tokenName, string tokenSymbol) external view returns (uint8) {
        return uint8(uintData.getStorage(bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string tokenName, string tokenSymbol) external {
        addressData.delStorage(bytes(tokenName), bytes(tokenSymbol));
        uintData.delStorage(bytes(tokenName), bytes(tokenSymbol));
    }
}
