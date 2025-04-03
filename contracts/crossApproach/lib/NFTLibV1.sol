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

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./RapidityTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
import "./EtherTransfer.sol";


/**
 * @title NFTLibV1
 * @dev Library for managing NFT cross-chain operations
 * This library provides functionality for:
 * - NFT locking and unlocking
 * - NFT minting and burning
 * - Cross-chain NFT transfer management
 */
library NFTLibV1 {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;

    /**
     * @notice Enumeration of supported token types for cross-chain operations
     * @dev Defines the types of tokens that can be transferred across chains
     */
    enum TokenCrossType {ERC20, ERC721, ERC1155}


    /**
     * @notice Parameters for user-initiated NFT locking operations
     * @dev Used when users want to lock their NFTs for cross-chain transfer
     * @param smgID ID of the selected storeman group
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to be locked
     * @param tokenValues Array of NFT token values (for ERC1155)
     * @param currentChainID ID of the current blockchain
     * @param tokenPairContractFee Fee for the token pair contract
     * @param etherTransferGasLimit Gas limit for ether transfers
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapidityUserLockNFTParams {
        bytes32                 smgID;                  /// ID of storeman group which user has selected
        uint                    tokenPairID;            /// token pair id on cross chain
        uint[]                  tokenIDs;               /// NFT token Ids
        uint[]                  tokenValues;            /// NFT token values
        uint                    currentChainID;         /// current chain ID
        uint                    tokenPairContractFee;   /// fee of token pair
        uint                    etherTransferGasLimit;  /// exchange token fee
        bytes                   destUserAccount;        /// account of shadow chain, used to receive token
        address                 smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    /**
     * @notice Parameters for storeman-initiated NFT minting operations
     * @dev Used when storeman group mints NFTs on the destination chain
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenIDs Array of NFT token IDs to be minted
     * @param tokenValues Array of NFT token values (for ERC1155)
     * @param extData Additional data for storeman operations
     * @param destTokenAccount Destination token contract address
     * @param destUserAccount Destination user account address
     */
    struct RapiditySmgMintNFTParams {
        bytes32                 uniqueID;               /// Rapidity random number
        bytes32                 smgID;                  /// ID of storeman group which user has selected
        uint                    tokenPairID;            /// token pair id on cross chain
        uint[]                  tokenIDs;               /// NFT token Ids
        uint[]                  tokenValues;            /// NFT token values
        bytes                   extData;                /// storeman data
        address                 destTokenAccount;       /// shadow token account
        address                 destUserAccount;        /// account of shadow chain, used to receive token
    }

    /**
     * @notice Parameters for user-initiated NFT burning operations
     * @dev Used when users want to burn their NFTs for cross-chain transfer
     * @param smgID ID of the selected storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenIDs Array of NFT token IDs to be burned
     * @param tokenValues Array of NFT token values (for ERC1155)
     * @param currentChainID ID of the current blockchain
     * @param tokenPairContractFee Fee for the token pair contract
     * @param etherTransferGasLimit Gas limit for ether transfers
     * @param srcTokenAccount Source token contract address
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapidityUserBurnNFTParams {
        bytes32                 smgID;                  /// ID of storeman group which user has selected
        uint                    tokenPairID;            /// token pair id on cross chain
        uint[]                  tokenIDs;               /// NFT token Ids
        uint[]                  tokenValues;            /// NFT token values
        uint                    currentChainID;         /// current chain ID
        uint                    tokenPairContractFee;   /// fee of token pair
        uint                    etherTransferGasLimit;  /// exchange token fee
        address                 srcTokenAccount;        /// shadow token account
        bytes                   destUserAccount;        /// account of token destination chain, used to receive token
        address                 smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    /**
     * @notice Parameters for storeman-initiated NFT release operations
     * @dev Used when storeman group releases NFTs on the original chain
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenIDs Array of NFT token IDs to be released
     * @param tokenValues Array of NFT token values (for ERC1155)
     * @param destTokenAccount Destination token contract address
     * @param destUserAccount Destination user account address
     */
    struct RapiditySmgReleaseNFTParams {
        bytes32                 uniqueID;               /// Rapidity random number
        bytes32                 smgID;                  /// ID of storeman group which user has selected
        uint                    tokenPairID;            /// token pair id on cross chain
        uint[]                  tokenIDs;               /// NFT token Ids
        uint[]                  tokenValues;            /// NFT token values
        address                 destTokenAccount;       /// original token/coin account
        address                 destUserAccount;        /// account of token original chain, used to receive token
    }

    /**
     * @notice Event emitted when NFTs are locked by a user
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenAccount Address of the token contract
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event UserLockNFT(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, string[] keys, bytes[] values);

    /**
     * @notice Event emitted when NFTs are burned by a user
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenAccount Address of the token contract
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event UserBurnNFT(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, string[] keys, bytes[] values);

    /**
     * @notice Event emitted when NFTs are minted by storeman group
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event SmgMintNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /**
     * @notice Event emitted when NFTs are released by storeman group
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event SmgReleaseNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /**
     * @notice Gets the token contract address and contract fee for a token pair
     * @dev Calculates the appropriate contract fee based on chain IDs and batch size
     * @param storageData Cross storage data
     * @param tokenPairID ID of the token pair
     * @param tokenPairContractFee Fee for the token pair contract
     * @param currentChainID ID of the current blockchain
     * @param batchLength Length of the batch operation
     * @return tokenScAddr Address of the token contract
     * @return contractFee Calculated contract fee
     * Requirements:
     * - Token pair must exist
     * - Current chain ID must be valid
     */
    function getTokenScAddrAndContractFee(CrossTypes.Data storage storageData, uint tokenPairID, uint tokenPairContractFee, uint currentChainID, uint batchLength)
        public
        view
        returns (address, uint)
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = tokenManager.getTokenPairInfo(tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        uint contractFee = tokenPairContractFee;
        address tokenScAddr;
        if (currentChainID == fromChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][toChainID];
            }
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][0];
            }
            tokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        } else if (currentChainID == toChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[toChainID][fromChainID];
            }
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[toChainID][0];
            }
            tokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        } else {
            require(false, "Invalid token pair");
        }
        if (contractFee > 0) {
            contractFee = contractFee.mul(9 + batchLength).div(10);
        }
        return (tokenScAddr, contractFee);
    }

    /**
     * @notice Locks NFTs for cross-chain transfer
     * @dev Handles the locking of ERC721 and ERC1155 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the NFT locking operation
     * Requirements:
     * - NFT type must be valid (ERC721 or ERC1155)
     * - User must have sufficient balance
     * - Contract must have approval to transfer tokens
     */
    function userLockNFT(CrossTypes.Data storage storageData, RapidityUserLockNFTParams memory params)
        public
    {
        address tokenScAddr;
        uint contractFee;
        (tokenScAddr, contractFee) = getTokenScAddrAndContractFee(storageData, params.tokenPairID, params.tokenPairContractFee, params.currentChainID, params.tokenIDs.length);

        if (contractFee > 0) {
            EtherTransfer.sendValue(payable(params.smgFeeProxy), contractFee, params.etherTransferGasLimit);
        }

        uint left = (msg.value).sub(contractFee);

        uint8 tokenCrossType = storageData.tokenManager.mapTokenPairType(params.tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < params.tokenIDs.length; ++idx) {
                IERC721(tokenScAddr).safeTransferFrom(msg.sender, address(this), params.tokenIDs[idx], "");
            }
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(tokenScAddr).safeBatchTransferFrom(msg.sender, address(this), params.tokenIDs, params.tokenValues, "");
        }
        else{
            require(false, "Invalid NFT type");
        }

        if (left != 0) {
            EtherTransfer.sendValue(payable(msg.sender), left, params.etherTransferGasLimit);
        }

        string[] memory keys = new string[](4);
        bytes[] memory values = new bytes[](4);

        keys[0] = "tokenIDs:uint256[]";
        values[0] = abi.encode(params.tokenIDs);

        keys[1] = "tokenValues:uint256[]";
        values[1] = abi.encode(params.tokenValues);

        keys[2] = "userAccount:bytes";
        values[2] = params.destUserAccount;

        keys[3] = "contractFee:uint256";
        values[3] = abi.encodePacked(contractFee);

        emit UserLockNFT(params.smgID, params.tokenPairID, tokenScAddr, keys, values);
    }

    /**
     * @notice Burns NFTs for cross-chain transfer
     * @dev Handles the burning of ERC721 and ERC1155 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the NFT burning operation
     * Requirements:
     * - NFT type must be valid (ERC721 or ERC1155)
     * - User must have sufficient balance
     * - Contract must have approval to burn tokens
     */
    function userBurnNFT(CrossTypes.Data storage storageData, RapidityUserBurnNFTParams memory params)
        public
    {
        address tokenScAddr;
        uint contractFee;
        (tokenScAddr, contractFee) = getTokenScAddrAndContractFee(storageData, params.tokenPairID, params.tokenPairContractFee, params.currentChainID, params.tokenIDs.length);

        ITokenManager tokenManager = storageData.tokenManager;
        uint8 tokenCrossType = tokenManager.mapTokenPairType(params.tokenPairID);
        require((tokenCrossType == uint8(TokenCrossType.ERC721) || tokenCrossType == uint8(TokenCrossType.ERC1155)), "Invalid NFT type");
        ITokenManager(tokenManager).burnNFT(uint(tokenCrossType), tokenScAddr, msg.sender, params.tokenIDs, params.tokenValues);

        if (contractFee > 0) {
            EtherTransfer.sendValue(payable(params.smgFeeProxy), contractFee, params.etherTransferGasLimit);
        }

        uint left = (msg.value).sub(contractFee);
        if (left != 0) {
            EtherTransfer.sendValue(payable(msg.sender), left, params.etherTransferGasLimit);
        }

        string[] memory keys = new string[](4);
        bytes[] memory values = new bytes[](4);

        keys[0] = "tokenIDs:uint256[]";
        values[0] = abi.encode(params.tokenIDs);

        keys[1] = "tokenValues:uint256[]";
        values[1] = abi.encode(params.tokenValues);

        keys[2] = "userAccount:bytes";
        values[2] = params.destUserAccount;

        keys[3] = "contractFee:uint256";
        values[3] = abi.encodePacked(contractFee);
        emit UserBurnNFT(params.smgID, params.tokenPairID, tokenScAddr, keys, values);
    }

    /**
     * @notice Mints NFTs on the destination chain
     * @dev Handles the minting of ERC721 and ERC1155 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the NFT minting operation
     * Requirements:
     * - NFT type must be valid (ERC721 or ERC1155)
     * - Storeman group must have permission to mint
     */
    function smgMintNFT(CrossTypes.Data storage storageData, RapiditySmgMintNFTParams memory params)
        public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        ITokenManager tokenManager = storageData.tokenManager;
        uint8 tokenCrossType = tokenManager.mapTokenPairType(params.tokenPairID);
        require((tokenCrossType == uint8(TokenCrossType.ERC721) || tokenCrossType == uint8(TokenCrossType.ERC1155)), "Invalid NFT type");
        ITokenManager(tokenManager).mintNFT(uint(tokenCrossType), params.destTokenAccount, params.destUserAccount, params.tokenIDs, params.tokenValues, params.extData);

        string[] memory keys = new string[](5);
        bytes[] memory values = new bytes[](5);

        keys[0] = "tokenIDs:uint256[]";
        values[0] = abi.encode(params.tokenIDs);

        keys[1] = "tokenValues:uint256[]";
        values[1] = abi.encode(params.tokenValues);

        keys[2] = "tokenAccount:address";
        values[2] = abi.encodePacked(params.destTokenAccount);

        keys[3] = "userAccount:address";
        values[3] = abi.encodePacked(params.destUserAccount);

        keys[4] = "extData:bytes";
        values[4] = params.extData;

        emit SmgMintNFT(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
    }

    /**
     * @notice Releases NFTs on the original chain
     * @dev Handles the release of ERC721 and ERC1155 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the NFT release operation
     * Requirements:
     * - NFT type must be valid (ERC721 or ERC1155)
     * - Storeman group must have permission to release
     */
    function smgReleaseNFT(CrossTypes.Data storage storageData, RapiditySmgReleaseNFTParams memory params)
        public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        uint8 tokenCrossType = storageData.tokenManager.mapTokenPairType(params.tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < params.tokenIDs.length; ++idx) {
                IERC721(params.destTokenAccount).safeTransferFrom(address(this), params.destUserAccount, params.tokenIDs[idx], "");
            }
        }
        else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(params.destTokenAccount).safeBatchTransferFrom(address(this), params.destUserAccount, params.tokenIDs, params.tokenValues, "");
        }
        else {
            require(false, "Invalid NFT type");
        }

        string[] memory keys = new string[](4);
        bytes[] memory values = new bytes[](4);

        keys[0] = "tokenIDs:uint256[]";
        values[0] = abi.encode(params.tokenIDs);

        keys[1] = "tokenValues:uint256[]";
        values[1] = abi.encode(params.tokenValues);

        keys[2] = "tokenAccount:address";
        values[2] = abi.encodePacked(params.destTokenAccount);

        keys[3] = "userAccount:address";
        values[3] = abi.encodePacked(params.destUserAccount);

        emit SmgReleaseNFT(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
    }
}
