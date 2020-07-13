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


import "./HTLCTxLib.sol";
import "./CrossTypes.sol";
import "../interfaces/ITokenManager.sol";
import "../interfaces/IRC20Protocol.sol";
import "../interfaces/ISmgAdminProxy.sol";
import "../interfaces/ISmgFeeProxy.sol";
import "../interfaces/IQuota.sol";

library HTLCMintLib {
    using SafeMath for uint;
    using HTLCTxLib for HTLCTxLib.Data;

    /**
    *
    * STRUCTURES
    *
    */


    /// @notice struct of HTLC user mint lock parameters
    struct HTLCUserMintLockParams {
        bytes32 xHash;                  /// hash of HTLC random number
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        // uint lockFee;                /// exchange token value
        uint lockedTime;                /// HTLC lock time
        bytes32 userShadowAccount;      /// account of shadow chain, used to receive token
        ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC user/storeman mint lock parameters
    struct HTLCUserMintRedeemParams {
        bytes32 x;                      /// HTLC random number
        ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC user mint revoke parameters
    struct HTLCUserMintRevokeParams {
        bytes32 xHash;                  /// hash of HTLC random number
        // uint revokeFee;                   /// exchange token value
        address smgFeeProxy;
        ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC storeman mint lock parameters
    struct HTLCSmgMintLockParams {
        bytes32 xHash;                      /// hash of HTLC random number
        bytes32 smgID;                      /// ID of storeman group which user has selected
        uint tokenPairID;                   /// token pair id on cross chain
        uint value;                         /// exchange token value
        uint lockedTime;                /// HTLC lock time
        address userShadowAccount;          /// account of shadow chain, used to receive token
        // bytes r;                            /// R in schnorr signature
        // bytes32 s;                          /// s in schnorr signature
        // ITokenManager tokenManager;         /// interface of token manager
        // ISignatureVerifier sigVerifier;     /// interface of signature verifier
    }

    /// @notice struct of HTLC storeman mint lock parameters
    struct HTLCSmgMintRedeemParams {
        bytes32 x;                      /// HTLC random number
        address smgFeeProxy;
    }

    /// @notice struct of HTLC storeman mint revoke parameters
    struct HTLCSmgMintRevokeParams {
        bytes32 xHash;                  /// hash of HTLC random number
    }

    /**
     *
     * EVENTS
     *
     **/


    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    HTLC value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserMintLockLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes32 userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param x                        HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param fee                      HTLC transaction fee
    event SmgMintRedeemLogger(bytes32 indexed x, bytes32 indexed smgID, uint indexed tokenPairID, uint fee);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param fee                      HTLC revoke fee
    event UserMintRevokeLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint fee);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    HTLC value
    /// @param userAccount              account of original chain, used to receive token
    event SmgMintLockLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param x                        HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    event UserMintRedeemLogger(bytes32 indexed x, bytes32 indexed smgID, uint indexed tokenPairID);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    event SmgMintRevokeLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                         mintBridge, user lock token on token original chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user mint lock token on token original chain
    function userMintLock(CrossTypes.Data storage storageData, HTLCUserMintLockParams memory params) public {
        uint origChainID;
        uint shadowChainID;
        bool isDeleted;
        bytes32 tokenOrigAccount;
        (origChainID,tokenOrigAccount,shadowChainID,,isDeleted) = params.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(!isDeleted, "Token doesn't exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];
        address tokenScAddr = CrossTypes.bytes32ToAddress(tokenOrigAccount);

        uint left;
        if (tokenScAddr == address(0)) {
            left = (msg.value).sub(params.value).sub(lockFee);
            // left = (msg.value).sub(params.value).sub(storageData.mapLockFee[origChainID][shadowChainID]);
            if (left != 0) {
                (msg.sender).transfer(left);
            }
        } else {
            left = (msg.value).sub(lockFee);
            // left = (msg.value).sub(storageData.mapLockFee[origChainID][shadowChainID]);
            if (left != 0) {
                (msg.sender).transfer(left);
            }

            require(IRC20Protocol(tokenScAddr).transferFrom(msg.sender, this, params.value), "Lock token failed");
        }

        HTLCTxLib.HTLCUserParams memory userTxParams = HTLCTxLib.HTLCUserParams({
            xHash: params.xHash,
            smgID: params.smgID,
            tokenPairID: params.tokenPairID,
            value: params.value,
            lockFee: lockFee,
            lockedTime: params.lockedTime,
            mirrorAccount: params.userShadowAccount
        });

        // storageData.htlcTxData.addUserTx(params.xHash, params.smgID, params.tokenPairID,
        //                             params.value, lockFee, params.lockedTime, params.userShadowAccount);
        storageData.htlcTxData.addUserTx(userTxParams);

        storageData.quota.mintLock(params.tokenPairID, params.smgID, params.value, true);

        emit UserMintLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, lockFee, params.userShadowAccount);
    }

    /// @notice                         mintBridge, storeman redeem token on token original chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint redeem token on token original chain
    function smgMintRedeem(CrossTypes.Data storage storageData, HTLCSmgMintRedeemParams memory params)
        public
    {
        bytes32 xHash = storageData.htlcTxData.redeemUserTx(params.x);

        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        (smgID, tokenPairID, value, lockFee,,) = storageData.htlcTxData.getUserTx(xHash);

        // TODO
        // GroupStatus status;
        // (,status,,,,,,,,,,) = params.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.mintRedeem(tokenPairID, smgID, value);
        if (lockFee > 0) {
            if (params.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(lockFee);
            } else {
                ISmgFeeProxy(params.smgFeeProxy).smgTransfer.value(lockFee)(smgID);
            }
        }

        emit SmgMintRedeemLogger(params.x, smgID, tokenPairID, lockFee);
    }

    /// @notice                         mintBridge, user mint revoke token on token original chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user mint revoke token on token original chain
    function userMintRevoke(CrossTypes.Data storage storageData, HTLCUserMintRevokeParams memory params)
        public
    {
        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        address userOrigAccount;
        (smgID, tokenPairID, value, lockFee, userOrigAccount,) = storageData.htlcTxData.getUserTx(params.xHash);

        // TODO
        // GroupStatus status;
        // (,status,,,,,,,,,,) = params.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        uint origChainID;
        uint shadowChainID;
        bytes32 tokenOrigAccount;
        // (origChainID,tokenOrigAccount,shadowChainID,,isDeleted) = params.tokenManager.getTokenPairInfo(tokenPairID);
        // require(!isDeleted, "Token doesn't exist");
        (origChainID, tokenOrigAccount, shadowChainID,,) = params.tokenManager.getTokenPairInfo(tokenPairID);

        uint revokeFee = storageData.mapRevokeFee[origChainID][shadowChainID];

        uint left = (msg.value).sub(revokeFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        storageData.htlcTxData.revokeUserTx(params.xHash, revokeFee);

        storageData.quota.mintRevoke(tokenPairID, smgID, value);

        if (revokeFee > 0) {
            if (params.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(revokeFee);
            } else {
                ISmgFeeProxy(params.smgFeeProxy).smgTransfer.value(revokeFee)(smgID);
            }
        }

        if (lockFee > 0) {
            (userOrigAccount).transfer(lockFee);
        }

        address tokenScAddr = CrossTypes.bytes32ToAddress(tokenOrigAccount);

        if (tokenScAddr == address(0)) {
            (userOrigAccount).transfer(value);
        } else {
            require(IRC20Protocol(tokenScAddr).transfer(userOrigAccount, value), "Transfer token failed");
        }

        emit UserMintRevokeLogger(params.xHash, smgID, tokenPairID, revokeFee);
    }

    /// @notice                         mintBridge, storeman mint lock token on token shadow chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint lock token on token shadow chain
    function smgMintLock(CrossTypes.Data storage storageData, HTLCSmgMintLockParams memory params)
        public
    {
        storageData.htlcTxData.addSmgTx(params.xHash, params.smgID, params.tokenPairID,
                                        params.value, params.userShadowAccount, params.lockedTime);

        storageData.quota.mintLock(params.tokenPairID, params.smgID, params.value, false);

        emit SmgMintLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, params.userShadowAccount);
    }

    /// @notice                         mintBridge, storeman mint redeem token on token shadow chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint redeem token on token shadow chain
    function userMintRedeem(CrossTypes.Data storage storageData, HTLCUserMintRedeemParams memory params)
        public
    {
        bytes32 xHash = storageData.htlcTxData.redeemSmgTx(params.x);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        address userShadowAccount;
        (smgID, tokenPairID, value, userShadowAccount) = storageData.htlcTxData.getSmgTx(xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = params.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.mintRedeem(tokenPairID, smgID, value);

        params.tokenManager.mintToken(tokenPairID, userShadowAccount, value);

        emit UserMintRedeemLogger(params.x, smgID, tokenPairID);
    }

    /// @notice                         mintBridge, storeman mint revoke token on token shadow chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint revoke token on token shadow chain
    function smgMintRevoke(CrossTypes.Data storage storageData, HTLCSmgMintRevokeParams memory params)
        public
    {
        storageData.htlcTxData.revokeSmgTx(params.xHash);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        (smgID, tokenPairID, value,) = storageData.htlcTxData.getSmgTx(params.xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = params.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.mintRevoke(tokenPairID, smgID, value);

        emit SmgMintRevokeLogger(params.xHash, smgID, tokenPairID);
    }

}
