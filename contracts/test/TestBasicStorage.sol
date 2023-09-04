// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/BasicStorage.sol";

contract TestBasicStorage is BasicStorage {
    /* uintData */
    function setUintData(bytes memory key, bytes memory innerKey, uint value)
        external
    {
        return BasicStorageLib.setStorage(uintData, key, innerKey, value);
    }

    function getUintData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (uint)
    {
        return BasicStorageLib.getStorage(uintData, key, innerKey);
    }

    function delUintData(bytes memory key, bytes memory innerKey)
        external
    {
        return BasicStorageLib.delStorage(uintData, key, innerKey);
    }

    /* boolData */
    function setBoolData(bytes memory key, bytes memory innerKey, bool value)
        external
    {
        BasicStorageLib.setStorage(boolData, key, innerKey, value);
    }

    function getBoolData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (bool)
    {
        return BasicStorageLib.getStorage(boolData, key, innerKey);
    }

    function delBoolData(bytes memory key, bytes memory innerKey)
        external
    {
        return BasicStorageLib.delStorage(boolData, key, innerKey);
    }

    /* addressData */
    function setAddressData(bytes memory key, bytes memory innerKey, address value)
        external
    {
        BasicStorageLib.setStorage(addressData, key, innerKey, value);
    }

    function getAddressData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (address)
    {
        return BasicStorageLib.getStorage(addressData, key, innerKey);
    }

    function delAddressData(bytes memory key, bytes memory innerKey)
        external
    {
        return BasicStorageLib.delStorage(addressData, key, innerKey);
    }

    /* bytesData */
    function setBytesData(bytes memory key, bytes memory innerKey, bytes memory value)
        external
    {
        BasicStorageLib.setStorage(bytesData, key, innerKey, value);
    }

    function getBytesData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (bytes memory)
    {
        return BasicStorageLib.getStorage(bytesData, key, innerKey);
    }

    function delBytesData(bytes memory key, bytes memory innerKey)
        external
    {
        return BasicStorageLib.delStorage(bytesData, key, innerKey);
    }

  /* stringData */
    function setStringData(bytes memory key, bytes memory innerKey, string memory value)
        external
    {
        BasicStorageLib.setStorage(stringData, key, innerKey, value);
    }

    function getStringData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (string memory)
    {
        return BasicStorageLib.getStorage(stringData, key, innerKey);
    }

   function delStringData(bytes memory key, bytes memory innerKey)
        external
    {
        return BasicStorageLib.delStorage(stringData, key, innerKey);
    }

}