// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../interfaces/IWrappedToken.sol";
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

    function createToken(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = address(new MappingNftToken(tokenName, tokenSymbol));
        BasicStorageLib.setStorage(addressData, bytes(tokenName), bytes(tokenSymbol), tokenInst);
        BasicStorageLib.setStorage(uintData, bytes(tokenName), bytes(tokenSymbol), tokenDecimal);
        // TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function changeOwner(string memory tokenName, string memory tokenSymbol) external {
        address tokenInst = BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function acceptOwnership(string memory tokenName, string memory tokenSymbol) external {
        address tokenInst = BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).acceptOwnership();
    }

    function getTokenAddr(string memory tokenName, string memory tokenSymbol) external view returns (address) {
        return BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
    }

    function mintToken(string memory tokenName, string memory tokenSymbol, address to, uint value) external {
        address tokenInst = BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        IWrappedToken(tokenInst).mint(to, value);
    }

    function burnToken(string memory tokenName, string memory tokenSymbol, address from, uint value) external {
        address tokenInst = BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        IWrappedToken(tokenInst).burn(from, value);
    }

    function tokenBalance(string memory tokenName, string memory tokenSymbol, address owner) external view returns (uint balance) {
        address tokenInst = BasicStorageLib.getStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        balance = MappingNftToken(tokenInst).balanceOf(owner);
    }

    function getTokenDecimal(string memory tokenName, string memory tokenSymbol) external view returns (uint8) {
        return uint8(BasicStorageLib.getStorage(uintData, bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string memory tokenName, string memory tokenSymbol) external {
        BasicStorageLib.delStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        BasicStorageLib.delStorage(uintData, bytes(tokenName), bytes(tokenSymbol));
    }
}
