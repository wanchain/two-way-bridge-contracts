/*

  Copyright 2019 Wanchain Foundation.

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

pragma solidity ^0.4.26;
pragma experimental ABIEncoderV2;


import "./RapidityTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/IRC20Protocol.sol";
import "../../interfaces/ISmgFeeProxy.sol";

library RapidityLib {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;

    /**
    *
    * STRUCTURES
    *
    */

    /// @notice struct of Rapidity storeman mint lock parameters
    struct RapidityUserLockParams {
        bytes32 smgID;                      /// ID of storeman group which user has selected
        uint tokenPairID;                   /// token pair id on cross chain
        uint value;                         /// exchange token value
        address origTokenAccount;           /// original token/coin account
        bytes userShadowAccount;            /// account of shadow chain, used to receive token
    }

    /// @notice struct of Rapidity storeman mint lock parameters
    struct RapiditySmgMintParams {
        bytes32 uniqueID;                   /// Rapidity random number
        bytes32 smgID;                      /// ID of storeman group which user has selected
        uint tokenPairID;                   /// token pair id on cross chain
        uint value;                         /// exchange token value
        address shadowTokenAccount;         /// shadow token account
        address userShadowAccount;          /// account of shadow chain, used to receive token
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapidityUserBurnParams {
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        address shadowTokenAccount;     /// shadow token account
        bytes userOrigAccount;          /// account of token original chain, used to receive token
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapiditySmgReleaseParams {
        bytes32 uniqueID;               /// Rapidity random number
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        address origTokenAccount;       /// original token/coin account
        address userOrigAccount;        /// account of token original chain, used to receive token
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
    event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param tokenAccount             Rapidity shadow token account
    /// @param value                    Rapidity value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param tokenAccount             Rapidity shadow token account
    /// @param userAccount              account of original chain, used to receive token
    event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param tokenAccount             Rapidity original token account
    /// @param userAccount              account of original chain, used to receive token
    event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);

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
        require(tokenManager.isOriginalTokenPair(params.tokenPairID), "Token does not an original token pair");

        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID, toTokenAccount) = tokenManager.getTokenPairInfo(params.tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        address fromTokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        address toTokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        // require((fromTokenScAddr == params.origTokenAccount) || (toTokenScAddr == params.origTokenAccount), "Invalid Token account");

        uint lockFee;
        if (fromTokenScAddr == params.origTokenAccount) {
            lockFee = storageData.mapLockFee[fromChainID][toChainID];
        } else if (toTokenScAddr == params.origTokenAccount) {
            lockFee = storageData.mapLockFee[toChainID][fromChainID];
        } else {
            require(false, "Invalid Token account");
        }

        storageData.quota.userLock(params.tokenPairID, params.smgID, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(lockFee)(params.smgID);
            }
        }

        uint left;
        if (params.origTokenAccount == address(0)) {
            left = (msg.value).sub(params.value).sub(lockFee);
        } else {
            left = (msg.value).sub(lockFee);

            require(CrossTypes.transferFrom(params.origTokenAccount, msg.sender, this, params.value), "Lock token failed");
        }
        if (left != 0) {
            (msg.sender).transfer(left);
        }
        emit UserLockLogger(params.smgID, params.tokenPairID, params.origTokenAccount, params.value, lockFee, params.userShadowAccount);
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

        address fromTokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        address toTokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        // require((fromTokenScAddr == params.shadowTokenAccount) || (toTokenScAddr == params.shadowTokenAccount), "Invalid Token account");

        uint lockFee;
        if (fromTokenScAddr == params.shadowTokenAccount) {
            lockFee = storageData.mapLockFee[toChainID][fromChainID];
        } else if (toTokenScAddr == params.shadowTokenAccount) {
            lockFee = storageData.mapLockFee[fromChainID][toChainID];
        } else {
            require(false, "Invalid Token account");
        }

        storageData.quota.userBurn(params.tokenPairID, params.smgID, params.value);

        tokenManager.burnToken(params.shadowTokenAccount, msg.sender, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(lockFee)(params.smgID);
            }
        }

        uint left = (msg.value).sub(lockFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        emit UserBurnLogger(params.smgID, params.tokenPairID, params.shadowTokenAccount, params.value, lockFee, params.userOrigAccount);
    }

    /// @notice                         mintBridge, storeman mint lock token on token shadow chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint lock token on token shadow chain
    function smgMint(CrossTypes.Data storage storageData, RapiditySmgMintParams memory params)
        public
    {
        ITokenManager tokenManager = storageData.tokenManager;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromTokenAccount, toTokenAccount) = tokenManager.getTokenPairInfoSlim(params.tokenPairID);

        address fromTokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        address toTokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        require((fromTokenScAddr == params.shadowTokenAccount) || (toTokenScAddr == params.shadowTokenAccount), "Invalid Token account");

        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgMint(params.tokenPairID, params.smgID, params.value);

        tokenManager.mintToken(params.shadowTokenAccount, params.userShadowAccount, params.value);

        emit SmgMintLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.shadowTokenAccount, params.userShadowAccount);
    }

    /// @notice                         burnBridge, storeman burn lock token on token shadow chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn lock token on token shadow chain
    function smgRelease(CrossTypes.Data storage storageData, RapiditySmgReleaseParams memory params)
        public
    {
        ITokenManager tokenManager = storageData.tokenManager;
        require(tokenManager.isOriginalTokenPair(params.tokenPairID), "Token does not an original token pair");

        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromTokenAccount, toTokenAccount) = tokenManager.getTokenPairInfoSlim(params.tokenPairID);

        address fromTokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        address toTokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        require((fromTokenScAddr == params.origTokenAccount) || (toTokenScAddr == params.origTokenAccount), "Invalid Token account");

        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgRelease(params.tokenPairID, params.smgID, params.value);

        if (params.origTokenAccount == address(0)) {
            (params.userOrigAccount).transfer(params.value);
        } else {
            require(CrossTypes.transfer(params.origTokenAccount, params.userOrigAccount, params.value), "Transfer token failed");
        }

        emit SmgReleaseLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.origTokenAccount, params.userOrigAccount);
    }

}
