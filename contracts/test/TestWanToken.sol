// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./WanToken.sol";
import "../components/BasicStorage.sol";
import "./TestIOwned.sol";

contract TestWanToken is BasicStorage {

    function createToken(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = address(new WanToken(tokenName, tokenSymbol, tokenDecimal));
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

    function getTokenDecimal(string memory tokenName, string memory tokenSymbol) external view returns (uint8) {
        return uint8(BasicStorageLib.getStorage(uintData, bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string memory tokenName, string memory tokenSymbol) external {
        BasicStorageLib.delStorage(addressData, bytes(tokenName), bytes(tokenSymbol));
        BasicStorageLib.delStorage(uintData, bytes(tokenName), bytes(tokenSymbol));
    }
}