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

library RapidityLibV4 {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;

    enum TokenCrossType {ERC20, ERC721, ERC1155}

    /**
    *
    * STRUCTURES
    *
    */

    /// @notice struct of Rapidity storeman mint lock parameters
    struct RapidityUserLockParams {
        bytes32 smgID;                    /// ID of storeman group which user has selected
        uint tokenPairID;                 /// token pair id on cross chain
        uint value;                       /// exchange token value
        uint currentChainID;              /// current chain ID
        uint tokenPairContractFee;        /// fee of token pair
        uint etherTransferGasLimit;     /// exchange token fee
        bytes destUserAccount;            /// account of shadow chain, used to receive token
        address smgFeeProxy;              /// address of the proxy to store fee for storeman group
    }

    /// @notice struct of Rapidity storeman mint lock parameters
    struct RapiditySmgMintParams {
        bytes32 uniqueID;                 /// Rapidity random number
        bytes32 smgID;                    /// ID of storeman group which user has selected
        uint tokenPairID;                 /// token pair id on cross chain
        uint value;                       /// exchange token value
        uint fee;                         /// exchange token fee
        address destTokenAccount;         /// shadow token account
        address destUserAccount;          /// account of shadow chain, used to receive token
        address smgFeeProxy;              /// address of the proxy to store fee for storeman group
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapidityUserBurnParams {
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        uint currentChainID;            /// current chain ID
        uint fee;                       /// exchange token fee
        uint tokenPairContractFee;      /// fee of token pair
        uint etherTransferGasLimit;     /// exchange token fee
        address srcTokenAccount;        /// shadow token account
        bytes destUserAccount;          /// account of token destination chain, used to receive token
        address smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapiditySmgReleaseParams {
        bytes32 uniqueID;               /// Rapidity random number
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        uint fee;                       /// exchange token fee
        uint etherTransferGasLimit;     /// exchange token fee
        address destTokenAccount;       /// original token/coin account
        address destUserAccount;        /// account of token original chain, used to receive token
        address smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    /**
     *
     * EVENTS
     *
     **/


    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param tokenAccount             Rapidity original token account
    /// @param value                    Rapidity value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param tokenAccount             Rapidity shadow token account
    /// @param value                    Rapidity value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param tokenAccount             Rapidity shadow token account
    /// @param userAccount              account of original chain, used to receive token
    event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    event SmgMint(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param tokenAccount             Rapidity original token account
    /// @param userAccount              account of original chain, used to receive token
    event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    event SmgRelease(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                         mintBridge, user lock token on token original chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user mint lock token on token original chain
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

    /// @notice                         burnBridge, user lock token on token original chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user burn lock token on token original chain
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

    /// @notice                         mintBridge, storeman mint lock token on token shadow chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint lock token on token shadow chain
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

    /// @notice                         burnBridge, storeman burn lock token on token shadow chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn lock token on token shadow chain
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

    function burnShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);

        tokenManager.burnToken(tokenAddress, userAccount, value);

        afterBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);
        return afterBalance == beforeBalance.sub(value);
    }

    function mintShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);

        tokenManager.mintToken(tokenAddress, userAccount, value);

        afterBalance = IRC20Protocol(tokenAddress).balanceOf(userAccount);
        return afterBalance == beforeBalance.add(value);
    }
}
