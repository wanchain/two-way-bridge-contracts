// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "../tokenManager/WanToken.sol";
import "../components/BasicStorage.sol";
import "./TestIOwned.sol";

contract TestWanToken is BasicStorage {

    function createToken(string calldata tokenName, string calldata tokenSymbol, uint8 tokenDecimal) external {
        address tokenInst = new WanToken(tokenName, tokenSymbol, tokenDecimal);
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

    function getTokenDecimal(string calldata tokenName, string calldata tokenSymbol) external view returns (uint8) {
        return uint8(uintData.getStorage(bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string calldata tokenName, string calldata tokenSymbol) external {
        addressData.delStorage(bytes(tokenName), bytes(tokenSymbol));
        uintData.delStorage(bytes(tokenName), bytes(tokenSymbol));
    }
}