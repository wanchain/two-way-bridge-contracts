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
import "../interfaces/ISmgFeeProxy.sol";

library HTLCBurnLib {
    using SafeMath for uint;
    using HTLCTxLib for HTLCTxLib.Data;

    /**
    *
    * STRUCTURES
    *
    */

    /// @notice struct of HTLC user burn lock parameters
    struct HTLCUserBurnLockParams {
        bytes32 xHash;                  /// hash of HTLC random number
        bytes32 smgID;                  /// ID of storeman group which user has selected
        uint tokenPairID;               /// token pair id on cross chain
        uint value;                     /// exchange token value
        // uint lockFee;                /// exchange token value
        uint lockedTime;                /// HTLC lock time
        bytes32 userOrigAccount;        /// account of token original chain, used to receive token
        // ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC user/storeman burn lock parameters
    struct HTLCUserBurnRedeemParams {
        bytes32 x;                      /// HTLC random number
        // ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC user burn revoke parameters
    struct HTLCUserBurnRevokeParams {
        bytes32 xHash;                  /// hash of HTLC random number
        // uint revokeFee;                   /// exchange token value
        // address smgFeeProxy;
        // ITokenManager tokenManager;     /// interface of token manager
    }

    /// @notice struct of HTLC storeman burn lock parameters
    struct HTLCSmgBurnLockParams {
        bytes32 xHash;                      /// hash of HTLC random number
        bytes32 smgID;                      /// ID of storeman group which user has selected
        uint tokenPairID;                   /// token pair id on cross chain
        uint value;                         /// exchange token value
        uint lockedTime;                    /// HTLC lock time
        address userOrigAccount;            /// account of token original chain, used to receive token
        // bytes r;                            /// R in schnorr signature
        // bytes32 s;                          /// s in schnorr signature
        // ITokenManager tokenManager;         /// interface of token manager
        // ISignatureVerifier sigVerifier;     /// interface of signature verifier
    }

    /// @notice struct of HTLC storeman burn lock parameters
    struct HTLCSmgBurnRedeemParams {
        bytes32 x;                          /// HTLC random number
        // address smgFeeProxy;
        // ITokenManager tokenManager;         /// interface of token manager
    }

    /// @notice struct of HTLC storeman burn revoke parameters
    struct HTLCSmgBurnRevokeParams {
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
    event UserBurnLockLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes32 userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param x                        HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param fee                      HTLC transaction fee
    event SmgBurnRedeemLogger(bytes32 indexed x, bytes32 indexed smgID, uint indexed tokenPairID, uint fee);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param fee                      HTLC revoke fee
    event UserBurnRevokeLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint fee);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    HTLC value
    /// @param userAccount              account of original chain, used to receive token
    event SmgBurnLockLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param x                        HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    event UserBurnRedeemLogger(bytes32 indexed x, bytes32 indexed smgID, uint indexed tokenPairID);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    event SmgBurnRevokeLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                         burnBridge, user lock token on token original chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user burn lock token on token original chain
    function userBurnLock(CrossTypes.Data storage storageData, HTLCUserBurnLockParams memory params)
        public
    {
        uint origChainID;
        uint shadowChainID;
        bool isValid;
        address tokenShadowAccount;
        (origChainID,,shadowChainID,tokenShadowAccount,isValid) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(isValid, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        uint left;
        if (tokenShadowAccount == address(0)) {
            left = (msg.value).sub(params.value).sub(lockFee);
            if (left != 0) {
                (msg.sender).transfer(left);
            }
        } else {
            left = (msg.value).sub(lockFee);
            if (left != 0) {
                (msg.sender).transfer(left);
            }

            require(IRC20Protocol(tokenShadowAccount).transferFrom(msg.sender, this, params.value), "Lock token failed");
        }

        HTLCTxLib.HTLCUserParams memory userTxParams = HTLCTxLib.HTLCUserParams({
            xHash: params.xHash,
            smgID: params.smgID,
            tokenPairID: params.tokenPairID,
            value: params.value,
            lockFee: lockFee,
            lockedTime: params.lockedTime,
            mirrorAccount: params.userOrigAccount
        });

        // storageData.htlcTxData.addUserTx(params.xHash, params.smgID, params.tokenPairID,
        //                             params.value, lockFee, params.lockedTime, params.userOrigAccount);
        storageData.htlcTxData.addUserTx(userTxParams);

        storageData.quota.burnLock(params.tokenPairID, params.smgID, params.value, true);

        emit UserBurnLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, lockFee, params.userOrigAccount);
    }

    /// @notice                         burnBridge, storeman redeem token on token original chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn redeem token on token original chain
    function smgBurnRedeem(CrossTypes.Data storage storageData, HTLCSmgBurnRedeemParams memory params)
        public
    {
        bytes32 xHash = storageData.htlcTxData.redeemUserTx(params.x);

        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        (smgID, tokenPairID, value, lockFee,,) = storageData.htlcTxData.getUserTx(xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.burnRedeem(tokenPairID, smgID, value);

        storageData.tokenManager.burnToken(tokenPairID, value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(lockFee)(smgID);
            }
        }

        emit SmgBurnRedeemLogger(params.x, smgID, tokenPairID, lockFee);
    }

    /// @notice                         burnBridge, user burn revoke token on token original chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user burn revoke token on token original chain
    function userBurnRevoke(CrossTypes.Data storage storageData, HTLCUserBurnRevokeParams memory params)
        public
    {
        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        address userShadowAccount;
        (smgID, tokenPairID, value, lockFee, userShadowAccount,) = storageData.htlcTxData.getUserTx(params.xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        uint origChainID;
        uint shadowChainID;
        address tokenShadowAccount;
        // (origChainID,,shadowChainID,tokenShadowAccount,isValid) = storageData.tokenManager.getTokenPairInfo(tokenPairID);
        // require(isValid, "Token does not exist");
        (origChainID,,shadowChainID,tokenShadowAccount,) = storageData.tokenManager.getTokenPairInfo(tokenPairID);

        uint revokeFee = storageData.mapRevokeFee[origChainID][shadowChainID];

        uint left = (msg.value).sub(revokeFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        storageData.htlcTxData.revokeUserTx(params.xHash, revokeFee);

        storageData.quota.burnRevoke(tokenPairID, smgID, value);

        if (revokeFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(revokeFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(revokeFee)(smgID);
            }
        }

        if (lockFee > 0) {
            (userShadowAccount).transfer(lockFee);
        }

        if (tokenShadowAccount == address(0)) {
            (userShadowAccount).transfer(value);
        } else {
            require(IRC20Protocol(tokenShadowAccount).transfer(userShadowAccount, value), "Transfer token failed");
        }

        emit UserBurnRevokeLogger(params.xHash, smgID, tokenPairID, revokeFee);
    }

    /// @notice                         burnBridge, storeman burn lock token on token shadow chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn lock token on token shadow chain
    function smgBurnLock(CrossTypes.Data storage storageData, HTLCSmgBurnLockParams memory params)
        public
    {
        storageData.htlcTxData.addSmgTx(params.xHash, params.smgID, params.tokenPairID,
                                        params.value, params.userOrigAccount, params.lockedTime);

        storageData.quota.burnLock(params.tokenPairID, params.smgID, params.value, false);

        emit SmgBurnLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, params.userOrigAccount);
    }

    /// @notice                         burnBridge, storeman burn redeem token on token shadow chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn redeem token on token shadow chain
    function userBurnRedeem(CrossTypes.Data storage storageData, HTLCUserBurnRedeemParams memory params)
        public
    {
        bytes32 xHash = storageData.htlcTxData.redeemSmgTx(params.x);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        address userOrigAccount;
        (smgID, tokenPairID, value, userOrigAccount) = storageData.htlcTxData.getSmgTx(xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.burnRedeem(tokenPairID, smgID, value);

        bytes memory tokenOrigAccount;
        (,tokenOrigAccount,,,) = storageData.tokenManager.getTokenPairInfo(tokenPairID);
        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);

        if (tokenScAddr == address(0)) {
            (userOrigAccount).transfer(value);
        } else {
            require(IRC20Protocol(tokenScAddr).transfer(userOrigAccount, value), "Transfer token failed");
        }

        emit UserBurnRedeemLogger(params.x, smgID, tokenPairID);
    }

    /// @notice                         burnBridge, storeman burn revoke token on token shadow chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn revoke token on token shadow chain
    function smgBurnRevoke(CrossTypes.Data storage storageData, HTLCSmgBurnRevokeParams memory params)
        public
    {
        storageData.htlcTxData.revokeSmgTx(params.xHash);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        (smgID, tokenPairID, value,) = storageData.htlcTxData.getSmgTx(params.xHash);

        // GroupStatus status;
        // (,status,,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        // require(status == GroupStatus.ready || status == GroupStatus.unregistered, "PK doesn't exist");

        storageData.quota.burnRevoke(tokenPairID, smgID, value);

        emit SmgBurnRevokeLogger(params.xHash, smgID, tokenPairID);
    }

}
