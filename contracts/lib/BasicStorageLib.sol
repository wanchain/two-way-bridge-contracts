// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title BasicStorageLib
 * @dev Library for basic storage operations with support for multiple data types
 * This library provides a structured approach to contract storage with a two-level key system
 * 
 * Key features:
 * - Support for multiple data types (uint, bool, address, bytes, string)
 * - Two-level key storage system for flexible data organization
 * - CRUD operations for each data type with consistent interface
 * - Gas-efficient storage patterns
 * 
 * @custom:security
 * - Internal access only to prevent unauthorized storage manipulation
 * - Safe storage operations with proper type enforcement
 * - Type-specific operations to prevent type confusion
 * - Consistent interface reduces likelihood of implementation errors
 * 
 * @custom:usage
 * - Used as a foundation for complex contract storage patterns
 * - Enables modular and organized data storage in contracts
 * - Simplifies storage access with standardized methods
 * - Perfect for contracts with diverse data storage needs
 */
library BasicStorageLib {

    /**
     * @dev Structure for storing uint values
     * Provides a two-level nested mapping for uint storage
     * 
     * @custom:usage
     * - Stores uint values with two-level key system for hierarchical data
     * - Used for numeric data storage such as balances, timestamps, amounts
     * - Primary key often represents a category, while innerKey represents specific item
     * - Essential for tracking numeric values in complex systems
     */
    struct UintData {
        mapping(bytes => mapping(bytes => uint))           _storage;
    }

    /**
     * @dev Structure for storing boolean values
     * Provides a two-level nested mapping for boolean storage
     * 
     * @custom:usage
     * - Stores boolean values with two-level key system for hierarchical data
     * - Used for flag and state storage such as activation status or permissions
     * - Efficient for representing binary states (true/false)
     * - Perfect for access control and feature toggles
     */
    struct BoolData {
        mapping(bytes => mapping(bytes => bool))           _storage;
    }

    /**
     * @dev Structure for storing address values
     * Provides a two-level nested mapping for address storage
     * 
     * @custom:usage
     * - Stores address values with two-level key system for hierarchical data
     * - Used for contract and account address storage
     * - Essential for tracking ownership, relationships between entities
     * - Enables role-based systems and contract registries
     */
    struct AddressData {
        mapping(bytes => mapping(bytes => address))        _storage;
    }

    /**
     * @dev Structure for storing bytes values
     * Provides a two-level nested mapping for bytes storage
     * 
     * @custom:usage
     * - Stores bytes values with two-level key system for hierarchical data
     * - Used for raw data storage such as cryptographic proofs, signatures
     * - Perfect for storing variable-length binary data
     * - Enables storage of complex serialized structures
     */
    struct BytesData {
        mapping(bytes => mapping(bytes => bytes))          _storage;
    }

    /**
     * @dev Structure for storing string values
     * Provides a two-level nested mapping for string storage
     * 
     * @custom:usage
     * - Stores string values with two-level key system for hierarchical data
     * - Used for text data storage such as names, descriptions, metadata
     * - Human-readable information storage
     * - Suitable for configuration parameters and user-facing content
     */
    struct StringData {
        mapping(bytes => mapping(bytes => string))         _storage;
    }

    /**
     * @dev Set uint value in storage
     * Assigns a uint value to a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization (e.g., user ID, token type)
     * @param innerKey Secondary key for specific attribute (e.g., balance, timestamp)
     * @param value Unsigned integer value to store
     * 
     * @custom:effects
     * - Updates storage with new value, overwriting any existing value
     * - Gas usage scales with key sizes, not with value size
     * - Optimized for single-slot storage operations
     */
    function setStorage(UintData storage self, bytes memory key, bytes memory innerKey, uint value) internal {
        self._storage[key][innerKey] = value;
    }

    /**
     * @dev Get uint value from storage
     * Retrieves a uint value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific attribute
     * @return Stored uint value, or 0 if no value has been set
     * 
     * @custom:effects
     * - Read-only operation that doesn't modify state
     * - Returns default value (0) if entry doesn't exist
     * - Gas cost is constant regardless of value stored
     */
    function getStorage(UintData storage self, bytes memory key, bytes memory innerKey) internal view returns (uint) {
        return self._storage[key][innerKey];
    }

    /**
     * @dev Delete uint value from storage
     * Removes a uint value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific attribute
     * 
     * @custom:effects
     * - Removes value from storage, setting it to default value (0)
     * - Gas refund is provided when clearing storage to zero
     * - Frees up storage space, potentially reducing contract storage costs
     */
    function delStorage(UintData storage self, bytes memory key, bytes memory innerKey) internal {
        delete self._storage[key][innerKey];
    }

    /**
     * @dev Set boolean value in storage
     * Assigns a boolean value to a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization (e.g., feature name, user ID)
     * @param innerKey Secondary key for specific flag (e.g., active, approved)
     * @param value Boolean value to store
     * 
     * @custom:effects
     * - Updates storage with new value, overwriting any existing value
     * - Gas efficient for storing binary state information
     * - Packs values efficiently in storage
     */
    function setStorage(BoolData storage self, bytes memory key, bytes memory innerKey, bool value) internal {
        self._storage[key][innerKey] = value;
    }

    /**
     * @dev Get boolean value from storage
     * Retrieves a boolean value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific flag
     * @return Stored boolean value, or false if no value has been set
     * 
     * @custom:effects
     * - Read-only operation that doesn't modify state
     * - Returns default value (false) if entry doesn't exist
     * - Gas efficient for checking state conditions
     */
    function getStorage(BoolData storage self, bytes memory key, bytes memory innerKey) internal view returns (bool) {
        return self._storage[key][innerKey];
    }

    /**
     * @dev Delete boolean value from storage
     * Removes a boolean value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific flag
     * 
     * @custom:effects
     * - Removes value from storage, setting it to default value (false)
     * - Gas refund is provided when clearing storage to zero
     * - Particularly efficient for boolean values
     */
    function delStorage(BoolData storage self, bytes memory key, bytes memory innerKey) internal {
        delete self._storage[key][innerKey];
    }

    /**
     * @dev Set address value in storage
     * Assigns an address value to a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization (e.g., role name, contract type)
     * @param innerKey Secondary key for specific relationship (e.g., owner, delegate)
     * @param value Ethereum address to store
     * 
     * @custom:effects
     * - Updates storage with new address, overwriting any existing value
     * - Stores full 20-byte Ethereum addresses
     * - Critical for tracking contract relationships and ownership
     */
    function setStorage(AddressData storage self, bytes memory key, bytes memory innerKey, address value) internal {
        self._storage[key][innerKey] = value;
    }

    /**
     * @dev Get address value from storage
     * Retrieves an address value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific relationship
     * @return Stored address value, or address(0) if no value has been set
     * 
     * @custom:effects
     * - Read-only operation that doesn't modify state
     * - Returns default value (address(0)) if entry doesn't exist
     * - Used for permission checks and relationship verification
     */
    function getStorage(AddressData storage self, bytes memory key, bytes memory innerKey) internal view returns (address) {
        return self._storage[key][innerKey];
    }

    /**
     * @dev Delete address value from storage
     * Removes an address value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific relationship
     * 
     * @custom:effects
     * - Removes value from storage, setting it to default value (address(0))
     * - Gas refund is provided when clearing storage to zero
     * - Important for revoking permissions or updating relationships
     */
    function delStorage(AddressData storage self, bytes memory key, bytes memory innerKey) internal {
        delete self._storage[key][innerKey];
    }

    /**
     * @dev Set bytes value in storage
     * Assigns a bytes value to a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization (e.g., data type, record ID)
     * @param innerKey Secondary key for specific data (e.g., signature, hash)
     * @param value Bytes data to store
     * 
     * @custom:effects
     * - Updates storage with new bytes data, overwriting any existing value
     * - Dynamically sized data is stored with length prefix
     * - Gas cost scales with the size of the bytes array
     * - Suitable for arbitrary binary data storage
     */
    function setStorage(BytesData storage self, bytes memory key, bytes memory innerKey, bytes memory value) internal {
        self._storage[key][innerKey] = value;
    }

    /**
     * @dev Get bytes value from storage
     * Retrieves a bytes value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific data
     * @return Stored bytes value, or empty bytes if no value has been set
     * 
     * @custom:effects
     * - Read-only operation that doesn't modify state
     * - Returns default value (empty bytes) if entry doesn't exist
     * - Gas cost scales with the size of the retrieved data
     * - Used for retrieving serialized data, proofs, or signatures
     */
    function getStorage(BytesData storage self, bytes memory key, bytes memory innerKey) internal view returns (bytes memory) {
        return self._storage[key][innerKey];
    }

    /**
     * @dev Delete bytes value from storage
     * Removes a bytes value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific data
     * 
     * @custom:effects
     * - Removes value from storage, setting it to default value (empty bytes)
     * - Gas refund is provided when clearing storage
     * - More gas efficient for larger data due to storage refunds
     * - Complete removal of variable-length data
     */
    function delStorage(BytesData storage self, bytes memory key, bytes memory innerKey) internal {
        delete self._storage[key][innerKey];
    }

    /**
     * @dev Set string value in storage
     * Assigns a string value to a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization (e.g., metadata type, record ID)
     * @param innerKey Secondary key for specific text (e.g., name, description)
     * @param value String data to store
     * 
     * @custom:effects
     * - Updates storage with new string, overwriting any existing value
     * - Strings are stored as UTF-8 encoded bytes with length prefix
     * - Gas cost scales with the length of the string
     * - Ideal for human-readable text storage
     */
    function setStorage(StringData storage self, bytes memory key, bytes memory innerKey, string memory value) internal {
        self._storage[key][innerKey] = value;
    }

    /**
     * @dev Get string value from storage
     * Retrieves a string value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific text
     * @return Stored string value, or empty string if no value has been set
     * 
     * @custom:effects
     * - Read-only operation that doesn't modify state
     * - Returns default value (empty string) if entry doesn't exist
     * - Gas cost scales with the length of the retrieved string
     * - Used for retrieving human-readable configuration and metadata
     */
    function getStorage(StringData storage self, bytes memory key, bytes memory innerKey) internal view returns (string memory) {
        return self._storage[key][innerKey];
    }

    /**
     * @dev Delete string value from storage
     * Removes a string value from a specific key pair in storage
     * 
     * @param self Storage structure reference
     * @param key Primary key for categorization
     * @param innerKey Secondary key for specific text
     * 
     * @custom:effects
     * - Removes value from storage, setting it to default value (empty string)
     * - Gas refund is provided when clearing storage
     * - More gas efficient for longer strings due to storage refunds
     * - Complete removal of variable-length text data
     */
    function delStorage(StringData storage self, bytes memory key, bytes memory innerKey) internal {
        delete self._storage[key][innerKey];
    }

}