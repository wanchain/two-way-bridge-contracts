// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../components/BasicStorage.sol";

contract TestBasicStorage is BasicStorage {
    using BasicStorageLib for BasicStorageLib.UintData;
    using BasicStorageLib for BasicStorageLib.BoolData;
    using BasicStorageLib for BasicStorageLib.AddressData;
    using BasicStorageLib for BasicStorageLib.BytesData;
    using BasicStorageLib for BasicStorageLib.StringData;
    /* uintData */
    function setUintData(bytes calldata key, bytes calldata innerKey, uint value)
        external
    {
        return uintData.setStorage(key, innerKey, value);
    }

    function getUintData(bytes calldata key, bytes calldata innerKey)
        external
        view
        returns (uint)
    {
        return uintData.getStorage(key, innerKey);
    }

    function delUintData(bytes calldata key, bytes calldata innerKey)
        external
    {
        return uintData.delStorage(key, innerKey);
    }

    /* boolData */
    function setBoolData(bytes calldata key, bytes calldata innerKey, bool value)
        external
    {
        boolData.setStorage(key, innerKey, value);
    }

    function getBoolData(bytes calldata key, bytes calldata innerKey)
        external
        view
        returns (bool)
    {
        return boolData.getStorage(key, innerKey);
    }

    function delBoolData(bytes calldata key, bytes calldata innerKey)
        external
    {
        return boolData.delStorage(key, innerKey);
    }

    /* addressData */
    function setAddressData(bytes calldata key, bytes calldata innerKey, address value)
        external
    {
        addressData.setStorage(key, innerKey, value);
    }

    function getAddressData(bytes calldata key, bytes calldata innerKey)
        external
        view
        returns (address)
    {
        return addressData.getStorage(key, innerKey);
    }

    function delAddressData(bytes calldata key, bytes calldata innerKey)
        external
    {
        return addressData.delStorage(key, innerKey);
    }

    /* bytesData */
    function setBytesData(bytes calldata key, bytes calldata innerKey, bytes calldata value)
        external
    {
        bytesData.setStorage(key, innerKey, value);
    }

    function getBytesData(bytes calldata key, bytes calldata innerKey)
        external
        view
        returns (bytes memory)
    {
        return bytesData.getStorage(key, innerKey);
    }

    function delBytesData(bytes calldata key, bytes calldata innerKey)
        external
    {
        return bytesData.delStorage(key, innerKey);
    }

  /* stringData */
    function setStringData(bytes calldata key, bytes calldata innerKey, string calldata value)
        external
    {
        stringData.setStorage(key, innerKey, value);
    }

    function getStringData(bytes calldata key, bytes calldata innerKey)
        external
        view
        returns (string memory)
    {
        return stringData.getStorage(key, innerKey);
    }

   function delStringData(bytes calldata key, bytes calldata innerKey)
        external
    {
        return stringData.delStorage(key, innerKey);
    }

}