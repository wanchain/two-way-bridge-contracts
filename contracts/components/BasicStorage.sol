// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../lib/BasicStorageLib.sol";

/**
 * @title BasicStorage
 * @dev Base contract for managing different types of storage data
 * This contract provides basic storage functionality for various data types
 * using the BasicStorageLib library
 * 
 * Key features:
 * - Multiple data type storage support
 * - Library-based storage management
 * - Internal storage access
 * 
 * @custom:usage
 * - Used as base contract for storage functionality
 * - Provides structured storage for different data types
 * - Supports inheritance for storage management
 */
contract BasicStorage {
    /************************************************************
     **
     ** VARIABLES
     **
     ************************************************************/

    //// basic variables
    /**
     * @dev Library usage declarations for different data types
     * 
     * @custom:usage
     * - UintData: For unsigned integer storage
     * - BoolData: For boolean storage
     * - AddressData: For address storage
     * - BytesData: For bytes storage
     * - StringData: For string storage
     */
    using BasicStorageLib for BasicStorageLib.UintData;
    using BasicStorageLib for BasicStorageLib.BoolData;
    using BasicStorageLib for BasicStorageLib.AddressData;
    using BasicStorageLib for BasicStorageLib.BytesData;
    using BasicStorageLib for BasicStorageLib.StringData;

    /**
     * @dev Internal storage variables for different data types
     * 
     * @custom:usage
     * - uintData: Stores unsigned integers
     * - boolData: Stores boolean values
     * - addressData: Stores addresses
     * - bytesData: Stores bytes data
     * - stringData: Stores strings
     * 
     * @custom:security
     * - Internal visibility for controlled access
     * - Library-based storage management
     */
    BasicStorageLib.UintData    internal uintData;
    BasicStorageLib.BoolData    internal boolData;
    BasicStorageLib.AddressData internal addressData;
    BasicStorageLib.BytesData   internal bytesData;
    BasicStorageLib.StringData  internal stringData;
}