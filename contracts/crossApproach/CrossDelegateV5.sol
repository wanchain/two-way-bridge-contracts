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

pragma solidity 0.8.18;

import "./CrossDelegateV4.sol";

/**
 * @title CrossDelegateV5
 * @dev Enhanced version of CrossDelegateV4 that adds NFT cross-chain ID management functionality
 * This contract extends CrossDelegateV4 to provide:
 * - NFT collection registration tracking
 * - Cross-chain ID mapping for NFTs
 * - Batch registration capabilities
 */
contract CrossDelegateV5 is CrossDelegateV4 {
    /**
     * @notice Mapping from NFT collection address to registration count
     * @dev Tracks the number of NFTs registered for cross-chain operations from each collection
     */
    mapping(address => uint256) public nftRegisterCount;

    /**
     * @notice Mapping from NFT collection and token ID to cross-chain ID
     * @dev Stores the cross-chain ID assigned to each NFT
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT within the collection
     * @return The assigned cross-chain ID
     */
    mapping(address => mapping(uint256 => uint256)) public crossId;

    /**
     * @notice Mapping from NFT collection and cross-chain ID to NFT token ID
     * @dev Stores the original NFT token ID for each cross-chain ID
     * @param collection The address of the NFT collection
     * @param crossId The cross-chain ID
     * @return The original NFT token ID
     */
    mapping(address => mapping(uint256 => uint256)) public crossIdToNftBaseInfo;

    /**
     * @notice Emitted when a new NFT is registered for cross-chain operations
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT within the collection
     * @param crossId The assigned cross-chain ID
     */
    event RegisterNftCrossId(address indexed collection, uint256 indexed tokenId, uint256 indexed crossId);

    /**
     * @notice Initiates a cross-chain NFT transfer by locking original NFTs
     * @dev Overrides the parent function to add cross-chain ID registration
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to transfer
     * @param tokenValues Array of token values (amounts) for each NFT
     * @param userAccount Account information for receiving NFTs on the destination chain
     */
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount)
        public
        payable
        override
    {
        super.userLockNFT(smgID, tokenPairID, tokenIDs, tokenValues, userAccount);

        address tokenScAddr = localTokenAddress(tokenPairID);
        uint count = tokenIDs.length;
        for (uint i = 0; i < count; i++) {
            registerNftCrossId(tokenScAddr, tokenIDs[i]);
        }
    }

    /**
     * @notice Registers a new NFT for cross-chain operations
     * @dev Assigns a unique cross-chain ID to an NFT if not already registered
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT within the collection
     * @return The assigned cross-chain ID
     */
    function registerNftCrossId(address collection, uint tokenId) internal returns (uint256) {
        if (crossId[collection][tokenId] > 0) {
            return crossId[collection][tokenId];
        } else {
            nftRegisterCount[collection] += 1;
            crossId[collection][tokenId] = nftRegisterCount[collection];
            crossIdToNftBaseInfo[collection][nftRegisterCount[collection]] = tokenId;
            emit RegisterNftCrossId(collection, tokenId, nftRegisterCount[collection]);
            return nftRegisterCount[collection];
        }
    }

    /**
     * @notice Registers multiple NFTs for cross-chain operations in a single transaction
     * @dev Allows admin to register multiple NFTs from different collections at once
     * @param collection Array of NFT collection addresses
     * @param tokenIds Array of NFT token IDs
     * Requirements:
     * - Caller must be admin
     * - Length of collection array must match length of tokenIds array
     */
    function batchRegisterNftCrossId(address[] memory collection, uint256[] memory tokenIds) external onlyAdmin {
        require(collection.length == tokenIds.length, "CrossDelegateV5: collection length not equal to tokenIds length");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            registerNftCrossId(collection[i], tokenIds[i]);
        }
    }

    /**
     * @notice Retrieves the local token address for a given token pair
     * @dev Determines the correct token address based on the current chain ID
     * @param tokenPairID ID of the token pair
     * @return The address of the token contract on the current chain
     * Requirements:
     * - Token pair must exist
     * - Current chain must be either source or destination chain
     */
    function localTokenAddress(uint tokenPairID)
        public
        view
        returns (address)
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = tokenManager.getTokenPairInfo(tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        address tokenScAddr;
        if (currentChainID == fromChainID) {
            tokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        } else if (currentChainID == toChainID) {
            tokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        } else {
            require(false, "Invalid token pair");
        }
        return tokenScAddr;
    }
}