pragma solidity ^0.4.24;

import "./WanToken.sol";
import "../components/BasicStorage.sol";
import "./TestIOwned.sol";
import "./IWanToken.sol";

contract TestWanTokenCreator is BasicStorage {

    function createToken(string tokenName, string tokenSymbol, uint8 tokenDecimal) public {
        address tokenInst = new WanToken(tokenName, tokenSymbol, tokenDecimal);
        addressData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenInst);
        uintData.setStorage(bytes(tokenName), bytes(tokenSymbol), tokenDecimal);
        // TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function changeOwner(string tokenName, string tokenSymbol) public {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).changeOwner(msg.sender);
    }

    function acceptOwnership(string tokenName, string tokenSymbol) public {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        TestIOwned(tokenInst).acceptOwnership();
    }

    function getTokenAddr(string tokenName, string tokenSymbol) public view returns (address) {
        return addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
    }

    function mintToken(string tokenName, string tokenSymbol, address to, uint value) public {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IWanToken(tokenInst).mint(to, value);
    }

    function burnToken(string tokenName, string tokenSymbol, address from, uint value) public {
        address tokenInst = addressData.getStorage(bytes(tokenName), bytes(tokenSymbol));
        IWanToken(tokenInst).burn(from, value);
    }

    function getTokenDecimal(string tokenName, string tokenSymbol) public view returns (uint8) {
        return uint8(uintData.getStorage(bytes(tokenName), bytes(tokenSymbol)));
    }

    function destroyToken(string tokenName, string tokenSymbol) public {
        addressData.delStorage(bytes(tokenName), bytes(tokenSymbol));
        uintData.delStorage(bytes(tokenName), bytes(tokenSymbol));
    }
}