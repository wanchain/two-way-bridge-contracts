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

import "./RapidityTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/IRC20Protocol.sol";
import "./EtherTransfer.sol";

/**
 * @title RapidityLibV4
 * @dev Library for managing rapid cross-chain token transfers
 * This library provides functionality for:
 * - Token locking and unlocking
 * - Token minting and burning
 * - Cross-chain token transfer management
 */
library RapidityLibV4 {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;

    /**
     * @notice Enumeration of supported token types for cross-chain operations
     * @dev Defines the types of tokens that can be transferred across chains
     */
    enum TokenCrossType {ERC20, ERC721, ERC1155}

    /**
     * @notice Parameters for user-initiated token locking operations
     * @dev Used when users want to lock their tokens for cross-chain transfer
     * @param smgID ID of the selected storeman group
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param currentChainID ID of the current blockchain
     * @param tokenPairContractFee Fee for the token pair contract
     * @param etherTransferGasLimit Gas limit for ether transfers
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapidityUserLockParams {
        bytes32 smgID;
        uint tokenPairID;
        uint value;
        uint currentChainID;
        uint tokenPairContractFee;
        uint etherTransferGasLimit;
        bytes destUserAccount;
        address smgFeeProxy;
    }

    /**
     * @notice Parameters for storeman-initiated token minting operations
     * @dev Used when storeman group mints tokens on the destination chain
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens to mint
     * @param fee Transaction fee
     * @param destTokenAccount Destination token contract address
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapiditySmgMintParams {
        bytes32 uniqueID;
        bytes32 smgID;
        uint tokenPairID;
        uint value;
        uint fee;
        address destTokenAccount;
        address destUserAccount;
        address smgFeeProxy;
    }

    /**
     * @notice Parameters for user-initiated token burning operations
     * @dev Used when users want to burn their tokens for cross-chain transfer
     * @param smgID ID of the selected storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens to burn
     * @param currentChainID ID of the current blockchain
     * @param fee Transaction fee
     * @param tokenPairContractFee Fee for the token pair contract
     * @param etherTransferGasLimit Gas limit for ether transfers
     * @param srcTokenAccount Source token contract address
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapidityUserBurnParams {
        bytes32 smgID;
        uint tokenPairID;
        uint value;
        uint currentChainID;
        uint fee;
        uint tokenPairContractFee;
        uint etherTransferGasLimit;
        address srcTokenAccount;
        bytes destUserAccount;
        address smgFeeProxy;
    }

    /**
     * @notice Parameters for storeman-initiated token release operations
     * @dev Used when storeman group releases tokens on the original chain
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens to release
     * @param fee Transaction fee
     * @param etherTransferGasLimit Gas limit for ether transfers
     * @param destTokenAccount Destination token contract address
     * @param destUserAccount Destination user account address
     * @param smgFeeProxy Address of the proxy for storing storeman group fees
     */
    struct RapiditySmgReleaseParams {
        bytes32 uniqueID;
        bytes32 smgID;
        uint tokenPairID;
        uint value;
        uint fee;
        uint etherTransferGasLimit;
        address destTokenAccount;
        address destUserAccount;
        address smgFeeProxy;
    }

    /**
     * @notice Event emitted when tokens are locked by a user
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenAccount Address of the token contract
     * @param value Amount of tokens locked
     * @param contractFee Contract fee charged
     * @param userAccount Destination user account address
     */
    event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);

    /**
     * @notice Event emitted when tokens are burned by a user
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param tokenAccount Address of the token contract
     * @param value Amount of tokens burned
     * @param contractFee Contract fee charged
     * @param fee Transaction fee charged
     * @param userAccount Destination user account address
     */
    event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);

    /**
     * @notice Event emitted when tokens are minted by storeman group
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens minted
     * @param tokenAccount Address of the token contract
     * @param userAccount Destination user account address
     */
    event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);

    /**
     * @notice Event emitted when tokens are minted by storeman group (with additional data)
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event SmgMint(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /**
     * @notice Event emitted when tokens are released by storeman group
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens released
     * @param tokenAccount Address of the token contract
     * @param userAccount Destination user account address
     */
    event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);

    /**
     * @notice Event emitted when tokens are released by storeman group (with additional data)
     * @param uniqueID Unique identifier for the rapidity transaction
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param keys Array of event keys
     * @param values Array of event values
     */
    event SmgRelease(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /**
     * @notice Locks tokens for cross-chain transfer
     * @dev Handles the locking of ERC20 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the token locking operation
     * Requirements:
     * - Token type must be ERC20
     * - User must have sufficient balance
     * - Contract must have approval to transfer tokens
     */
    function userLock(CrossTypes.Data storage storageData, RapidityUserLockParams memory params)
    public
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = tokenManager.getTokenPairInfo(params.tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        uint contractFee = params.tokenPairContractFee;
        address tokenScAddr;
        if (params.currentChainID == fromChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][toChainID];
            }
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][0];
            }
            tokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        } else if (params.currentChainID == toChainID) {
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
            EtherTransfer.sendValue(payable(params.smgFeeProxy), contractFee, params.etherTransferGasLimit);
        }

        uint left;
        if (tokenScAddr == address(0)) {
            left = (msg.value).sub(params.value).sub(contractFee);
        } else {
            left = (msg.value).sub(contractFee);

            uint8 tokenCrossType = tokenManager.mapTokenPairType(params.tokenPairID);
            require(tokenCrossType == uint8(TokenCrossType.ERC20), "Not support");
            require(CrossTypes.transferFrom(tokenScAddr, msg.sender, address(this), params.value), "Lock token failed");
        }
        if (left != 0) {
            EtherTransfer.sendValue(payable(msg.sender), left, params.etherTransferGasLimit);
        }
        emit UserLockLogger(params.smgID, params.tokenPairID, tokenScAddr, params.value, contractFee, params.destUserAccount);
    }

    /**
     * @notice Burns tokens for cross-chain transfer
     * @dev Handles the burning of ERC20 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the token burning operation
     * Requirements:
     * - Token type must be ERC20
     * - User must have sufficient balance
     * - Contract must have approval to burn tokens
     */
    function userBurn(CrossTypes.Data storage storageData, RapidityUserBurnParams memory params)
    public
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = tokenManager.getTokenPairInfo(params.tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        uint256 contractFee = params.tokenPairContractFee;
        address tokenScAddr;
        if (params.currentChainID == toChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[toChainID][fromChainID];
            }
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[toChainID][0];
            }
            tokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        } else if (params.currentChainID == fromChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][toChainID];
            }
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][0];
            }
            tokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        } else {
            require(false, "Invalid token pair");
        }
        require(params.srcTokenAccount == tokenScAddr, "Invalid token account");

        // Reuse variable fromChainID as tokenCrossType; burn token by tokenCrossType
        fromChainID = tokenManager.mapTokenPairType(params.tokenPairID);
        require(fromChainID == uint8(TokenCrossType.ERC20), "Not support");
        require(burnShadowToken(tokenManager, tokenScAddr, msg.sender, params.value), "Burn failed");

        if (contractFee > 0) {
            EtherTransfer.sendValue(payable(params.smgFeeProxy), contractFee, params.etherTransferGasLimit);
        }

        uint left = (msg.value).sub(contractFee);
        if (left != 0) {
            EtherTransfer.sendValue(payable(msg.sender), left, params.etherTransferGasLimit);
        }

        emit UserBurnLogger(params.smgID, params.tokenPairID, tokenScAddr, params.value, contractFee, params.fee, params.destUserAccount);
    }

    /**
     * @notice Mints tokens on the destination chain
     * @dev Handles the minting of ERC20 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the token minting operation
     * Requirements:
     * - Token type must be valid (ERC20)
     * - Storeman group must have permission to mint
     */
    function smgMint(CrossTypes.Data storage storageData, RapiditySmgMintParams memory params)
    public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        ITokenManager tokenManager = storageData.tokenManager;
        uint8 tokenCrossType = tokenManager.mapTokenPairType(params.tokenPairID);
        require(tokenCrossType == uint8(TokenCrossType.ERC20), "Not support");
        if (params.fee > 0) {
            require(mintShadowToken(tokenManager, params.destTokenAccount, params.smgFeeProxy, params.fee), "Mint fee failed");
        }
        require(mintShadowToken(tokenManager, params.destTokenAccount, params.destUserAccount, params.value), "Mint failed");

        string[] memory keys = new string[](4);
        bytes[] memory values = new bytes[](4);
        keys[0] = "value:uint256";
        values[0] = abi.encodePacked(params.value);
        keys[1] = "tokenAccount:address";
        values[1] = abi.encodePacked(params.destTokenAccount);
        keys[2] = "userAccount:address";
        values[2] = abi.encodePacked(params.destUserAccount);
        keys[3] = "fee:uint256";
        values[3] = abi.encodePacked(params.fee);
        emit SmgMint(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
        emit SmgMintLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.destTokenAccount, params.destUserAccount);
    }

    /**
     * @notice Releases tokens on the original chain
     * @dev Handles the release of ERC20 tokens
     * @param storageData Cross storage data
     * @param params Parameters for the token release operation
     * Requirements:
     * - Token type must be ERC20
     * - Storeman group must have permission to release
     */
    function smgRelease(CrossTypes.Data storage storageData, RapiditySmgReleaseParams memory params)
    public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        if (params.destTokenAccount == address(0)) {
            EtherTransfer.sendValue(payable(params.destUserAccount), params.value, params.etherTransferGasLimit);
            if (params.fee > 0) {
                EtherTransfer.sendValue(payable(params.smgFeeProxy), params.fee, params.etherTransferGasLimit);
            }
        } else {
            uint8 tokenCrossType = storageData.tokenManager.mapTokenPairType(params.tokenPairID);
            require(tokenCrossType == uint8(TokenCrossType.ERC20), "Not support");
            if (params.fee > 0) {
                require(CrossTypes.transfer(params.destTokenAccount, params.smgFeeProxy, params.fee), "Transfer token fee failed");
            }
            require(CrossTypes.transfer(params.destTokenAccount, params.destUserAccount, params.value), "Transfer token failed");
        }

        string[] memory keys = new string[](4);
        bytes[] memory values = new bytes[](4);
        keys[0] = "value:uint256";
        values[0] = abi.encodePacked(params.value);
        keys[1] = "tokenAccount:address";
        values[1] = abi.encodePacked(params.destTokenAccount);
        keys[2] = "userAccount:address";
        values[2] = abi.encodePacked(params.destUserAccount);
        keys[3] = "fee:uint256";
        values[3] = abi.encodePacked(params.fee);
        emit SmgRelease(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
        emit SmgReleaseLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.destTokenAccount, params.destUserAccount);
    }

    /**
     * @notice Burns shadow tokens
     * @dev Handles the burning of ERC20 tokens
     * @param tokenManager Token manager contract
     * @param tokenAddress Address of the token contract
     * @param userAccount Address of the user account
     * @param value Amount of tokens to burn
     * @return bool indicating whether the burn was successful
     */
    function burnShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);

        tokenManager.burnToken(tokenAddress, userAccount, value);

        afterBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);
        return afterBalance == beforeBalance.sub(value);
    }

    /**
     * @notice Mints shadow tokens
     * @dev Handles the minting of ERC20 tokens
     * @param tokenManager Token manager contract
     * @param tokenAddress Address of the token contract
     * @param userAccount Address of the user account
     * @param value Amount of tokens to mint
     * @return bool indicating whether the mint was successful
     */
    function mintShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);

        tokenManager.mintToken(tokenAddress, userAccount, value);

        afterBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);
        return afterBalance == beforeBalance.add(value);
    }
}
