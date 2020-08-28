// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "../tokenManager/MappingToken.sol";
import "../tokenManager/IMappingToken.sol";
import "../components/BasicStorage.sol";
import "./TestIOwned.sol";

contract TestOrigTokenCreator is BasicStorage {
    address _admin;

    modifier onlyAdmin {
        require(_admin != address(0), "admin is null");
        _;
    }

    function setAdmin(address admin) external {
        _admin = admin;
    }

    function getAdmin() external returns (address) {
        return _admin;
    }

    function createToken(string calldata tokenName, string calldata tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = new MappingToken(tokenName, tokenSymbol, tokenDecimal);
        addressData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenInst);
        uintData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenDecimal);
        // TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function changeOwner(string calldata tokenName, string calldata tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function acceptOwnership(string calldata tokenName, string calldata tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).acceptOwnership();
    }

    function getTokenAddr(string calldata tokenName, string calldata tokenSymbol) external view returns (address) {
        return addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
    }

    function mintToken(string calldata tokenName, string calldata tokenSymbol, address to, uint value) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IMappingToken(tokenInst).mint(to, value);
    }

    function burnToken(string calldata tokenName, string calldata tokenSymbol, address from, uint value) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IMappingToken(tokenInst).burn(from, value);
    }

    function getTokenDecimal(string calldata tokenName, string calldata tokenSymbol) external view returns (uint8) {
        return uint8(uintData.getStorage(bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string calldata tokenName, string calldata tokenSymbol) external {
        addressData.delStorage(bytes(tokenName), bytes(tokenSymbol));
        uintData.delStorage(bytes(tokenName), bytes(tokenSymbol));
    }
}