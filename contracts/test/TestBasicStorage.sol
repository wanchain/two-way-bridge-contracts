// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/BasicStorage.sol";

contract TestBasicStorage is BasicStorage {
    /* uintData */
    function setUintData(bytes memory key, bytes memory innerKey, uint value)
        external
    {
        return uintData.setStorage(key, innerKey, value);
    }

    function getUintData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (uint)
    {
        return uintData.getStorage(key, innerKey);
    }

    function delUintData(bytes memory key, bytes memory innerKey)
        external
    {
        return uintData.delStorage(key, innerKey);
    }

    /* boolData */
    function setBoolData(bytes memory key, bytes memory innerKey, bool value)
        external
    {
        boolData.setStorage(key, innerKey, value);
    }

    function getBoolData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (bool)
    {
        return boolData.getStorage(key, innerKey);
    }

    function delBoolData(bytes memory key, bytes memory innerKey)
        external
    {
        return boolData.delStorage(key, innerKey);
    }

    /* addressData */
    function setAddressData(bytes memory key, bytes memory innerKey, address value)
        external
    {
        addressData.setStorage(key, innerKey, value);
    }

    function getAddressData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (address)
    {
        return addressData.getStorage(key, innerKey);
    }

    function delAddressData(bytes memory key, bytes memory innerKey)
        external
    {
        return addressData.delStorage(key, innerKey);
    }

    /* bytesData */
    function setBytesData(bytes memory key, bytes memory innerKey, bytes memory value)
        external
    {
        bytesData.setStorage(key, innerKey, value);
    }

    function getBytesData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (bytes memory)
    {
        return bytesData.getStorage(key, innerKey);
    }

    function delBytesData(bytes memory key, bytes memory innerKey)
        external
    {
        return bytesData.delStorage(key, innerKey);
    }

  /* stringData */
    function setStringData(bytes memory key, bytes memory innerKey, string memory value)
        external
    {
        stringData.setStorage(key, innerKey, value);
    }

    function getStringData(bytes memory key, bytes memory innerKey)
        external
        view
        returns (string memory)
    {
        return stringData.getStorage(key, innerKey);
    }

   function delStringData(bytes memory key, bytes memory innerKey)
        external
    {
        return stringData.delStorage(key, innerKey);
    }

}