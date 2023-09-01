// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../tokenManager/WanToken.sol";
import "../components/BasicStorage.sol";
import "./TestIOwned.sol";

contract TestWanToken is BasicStorage {

    function createToken(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = new WanToken(tokenName, tokenSymbol, tokenDecimal);
        addressData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenInst);
        uintData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenDecimal);
        // TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function changeOwner(string memory tokenName, string memory tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function acceptOwnership(string memory tokenName, string memory tokenSymbol) external {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).acceptOwnership();
    }

    function getTokenAddr(string memory tokenName, string memory tokenSymbol) external view returns (address) {
        return addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
    }

    function getTokenDecimal(string memory tokenName, string memory tokenSymbol) external view returns (uint8) {
        return uint8(uintData.getStorage(bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string memory tokenName, string memory tokenSymbol) external {
        addressData.delStorage(bytes(tokenName), bytes(tokenSymbol));
        uintData.delStorage(bytes(tokenName), bytes(tokenSymbol));
    }
}