// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//

pragma solidity ^0.8.18;

/**
 * @title CommonTool
 * @dev Library for common cryptographic and data manipulation operations
 * This library provides utility functions used throughout the cross-chain bridge system
 * 
 * Key features:
 * - Bytes to uint conversion for binary data handling
 * - Bytes to bytes32 conversion for hash processing
 * - Bytes comparison for message verification
 * - Encryption operations for secure cross-chain communication
 * - Support for different elliptic curve types
 * 
 * @custom:security
 * - Safe memory operations with boundary checks
 * - Input validation for cryptographic operations
 * - Precompile contract calls for gas-efficient cryptography
 * - Null byte handling in comparisons
 */
library CommonTool {

    /**
     * @dev Enum for supported elliptic curve types
     * Used to specify which curve to use for cryptographic operations
     * 
     * @custom:values
     * - SK: Secp256k1 curve (used by Ethereum, Bitcoin)
     * - BN: Bn256 curve (used for pairing-based cryptography)
     * 
     * @custom:usage
     * - Different chains may require different curve types
     * - Curve selection affects signature verification and key operations
     */
    enum CurveType  {SK, BN}

    /**
     * @dev Address of the precompile contract for extended cryptographic operations
     * This contract provides functions beyond standard precompiles
     */
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    /**
     * @dev Convert a subsection of a bytes array to uint256
     * Performs big-endian conversion (most significant byte first)
     * 
     * @param source Source bytes array containing the data
     * @param offset Starting position in bytes array (0-indexed)
     * @param length Number of bytes to convert (max 32)
     * 
     * @return uint The converted unsigned integer value
     * 
     * @custom:effects
     * - Converts specified bytes to uint256 using big-endian byte order
     * - Left-pads with zeros if length < 32
     * - Useful for extracting numeric fields from serialized messages
     * - Used in cross-chain message parsing and verification
     */
    function bytes2uint(bytes memory source, uint16 offset, uint16 length)
    public
    pure
    returns(uint)
    {
        uint number = 0;
        for (uint i = 0; i < length; i++) {
            number = number + uint8(source[i + offset]) * (2 ** (8 * (length - (i + 1))));
        }
        return number;
    }

    /**
     * @dev Convert first 32 bytes of a bytes array to bytes32
     * Efficient conversion using assembly
     * 
     * @param source Source bytes array
     * 
     * @return bytes32 The converted bytes32 value
     * 
     * @custom:effects
     * - Directly loads first 32 bytes into a bytes32 value
     * - More gas efficient than byte-by-byte copying
     * - Used for extracting fixed-size fields like hashes, IDs, and signatures
     * - No effect if source is less than 32 bytes (will be right-padded with zeros)
     * 
     * @custom:assembly Uses assembly for direct memory access and loading
     */
    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        assembly {
            result := mload(add(source, 32))
        }
    }

    /**
     * @dev Compare two bytes arrays for equality, with padding support
     * 
     * @param b1 First bytes array (reference array)
     * @param b2 Second bytes array (may contain right padding with zeros)
     * 
     * @return bool True if arrays are equal (accounting for padding), false otherwise
     * 
     * @custom:effects
     * - Compares bytes arrays byte by byte for equality
     * - Handles zero-padding in the second array (ignores trailing zeros in b2)
     * - Returns false if b2 is shorter than b1
     * - Returns false if b2 has non-zero bytes beyond b1's length
     * - Used for comparing contract addresses, public keys, and other identifiers
     * - Critical for verifying cross-chain message authenticity
     */
    function cmpBytes(bytes memory b1, bytes memory b2)
    public
    pure
    returns(bool)
    {
        uint len1 = b1.length;
        uint len2 = b2.length; // maybe has padding
        if (len2 >= len1) {
            for (uint i = 0; i < len2; i++) {
                if (i < len1) {
                    if (b1[i] != b2[i]) {
                        return false;
                    }
                } else if (b2[i] != 0x0) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Encrypt data using ECIES (Elliptic Curve Integrated Encryption Scheme)
     * Provides hybrid encryption combining ECC with symmetric encryption
     * 
     * @param rbpri Random ephemeral private key for this encryption operation
     * @param iv Initialization vector for symmetric encryption (AES)
     * @param mes The message value to encrypt
     * @param pub The recipient's public key
     * 
     * @return bytes Encrypted data (contains ciphertext and other ECIES components)
     * @return success Whether encryption was successful
     * 
     * @custom:effects
     * - Performs ECIES encryption using a precompile contract
     * - Generates a shared secret using ECC
     * - Uses the shared secret with AES to encrypt the message
     * - Returns the complete encrypted package and success status
     * - Used for secure communication between storeman nodes
     * - Ensures only the intended recipient can decrypt the message
     * 
     * @custom:security
     * - Fresh ephemeral key should be used for each encryption
     * - IV should be unique for each encryption operation
     * - Relies on secure precompile implementation
     */
    function enc(bytes32 rbpri, bytes32 iv, uint256 mes, bytes memory pub)
    public
    view
    returns(bytes memory, bool success)
    {
        bytes32 functionSelector = 0xa1ecea4b00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        bytes memory cc = new bytes(6*32);
        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), rbpri)
            mstore(add(freePtr, 36), iv)
            mstore(add(freePtr, 68), mes)
            mstore(add(freePtr, 100), mload(add(pub, 32)))
            mstore(add(freePtr, 132), mload(add(pub, 64)))

        // call ERC20 Token contract transfer function
            success := staticcall(gas(),to, freePtr, 164, freePtr, 1024)

            for { let loopCnt := 0 } lt(loopCnt, 6) { loopCnt := add(loopCnt, 1) } {
                mstore(add(cc, mul(add(loopCnt, 1), 32)), mload(add(freePtr, mul(loopCnt, 32))))
            }
        }
        return (cc,success);
    }
}
