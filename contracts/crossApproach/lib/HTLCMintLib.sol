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

// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;


import "./HTLCTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
// import "../interfaces/IRC20Protocol.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ISmgFeeProxy.sol";
import "../../interfaces/IQuota.sol";

library HTLCMintLib {
    using SafeMath for uint;
    using HTLCTxLib for HTLCTxLib.Data;

    /**
    *
    * STRUCTURES
    *
    */


    /// @notice struct of HTLC mint lock parameters
    struct HTLCUserMintLockParams {
        bytes32 xHash;                  // hash of HTLC random number
        bytes32 smgID;                  // ID of storeman group which user has selected
        uint tokenPairID;               // token pair id on cross chain
        uint value;                     // exchange token value
        uint lockedTime;                // HTLC lock time
        bytes userShadowAccount;        // account of shadow chain, used to receive token
    }

    /// @notice struct of HTLC mint lock parameters
    struct HTLCSmgMintLockParams {
        bytes32 xHash;                  // hash of HTLC random number
        bytes32 smgID;                  // ID of storeman group which user has selected
        uint tokenPairID;               // token pair id on cross chain
        uint value;                     // exchange token value
        uint lockedTime;                // HTLC lock time
        address userShadowAccount;        // account of shadow chain, used to receive token
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
    event UserMintLockLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param fee                      HTLC transaction fee
    /// @param x                        HTLC random number
    event SmgMintRedeemLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, uint fee, bytes32 x);

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
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param x                        HTLC random number
    event UserMintRedeemLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID, bytes32 x);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param xHash                    hash of HTLC random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    event SmgMintRevokeLogger(bytes32 indexed xHash, bytes32 indexed smgID, uint indexed tokenPairID);

    /// @notice                         event of return lock/revoke fee left
    /// @notice                         event transfer to by cross approach
    /// @param to                       The address of the recipient
    /// @param value                    Rapidity value
    event TransferToLogger(address indexed to, uint value);

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
        bytes memory tokenOrigAccount;
        (origChainID,tokenOrigAccount,shadowChainID,) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        HTLCTxLib.HTLCUserParams memory userTxParams = HTLCTxLib.HTLCUserParams({
            xHash: params.xHash,
            smgID: params.smgID,
            tokenPairID: params.tokenPairID,
            value: params.value,
            lockFee: lockFee,
            lockedTime: params.lockedTime
        });

        storageData.htlcTxData.addUserTx(userTxParams);

        storageData.quota.userMintLock(params.tokenPairID, params.smgID, params.value);

        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);

        uint left;
        if (tokenScAddr == address(0)) {
            left = (msg.value).sub(params.value).sub(lockFee);
        } else {
            left = (msg.value).sub(lockFee);

            // require(IRC20Protocol(tokenScAddr).transferFrom(msg.sender, this, params.value), "Lock token failed");
            require(CrossTypes.transferFrom(tokenScAddr, msg.sender, address(this), params.value), "Lock token failed");
        }
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        emit UserMintLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, lockFee, params.userShadowAccount);
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

        storageData.quota.smgMintLock(params.tokenPairID, params.smgID, params.value);

        emit SmgMintLockLogger(params.xHash, params.smgID, params.tokenPairID, params.value, params.userShadowAccount);
    }

    /// @notice                         mintBridge, storeman mint redeem token on token shadow chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param x                        HTLC random number
    function userMintRedeem(CrossTypes.Data storage storageData, bytes32 x)
        external
    {
        bytes32 xHash = storageData.htlcTxData.redeemSmgTx(x);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        address userShadowAccount;
        (smgID, tokenPairID, value, userShadowAccount) = storageData.htlcTxData.getSmgTx(xHash);

        storageData.quota.userMintRedeem(tokenPairID, smgID, value);

        storageData.tokenManager.mintToken(tokenPairID, userShadowAccount, value);

        emit UserMintRedeemLogger(xHash, smgID, tokenPairID, x);
    }

    /// @notice                         mintBridge, storeman redeem token on token original chain
    /// @notice                         event invoked by user redeem
    /// @param storageData              Cross storage data
    /// @param x                        HTLC random number
    function smgMintRedeem(CrossTypes.Data storage storageData, bytes32 x)
        external
    {
        bytes32 xHash = storageData.htlcTxData.redeemUserTx(x);

        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        (smgID, tokenPairID, value, lockFee,) = storageData.htlcTxData.getUserTx(xHash);

        storageData.quota.smgMintRedeem(tokenPairID, smgID, value);
        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer{value: lockFee}(smgID);
            }
        }

        emit SmgMintRedeemLogger(xHash, smgID, tokenPairID, lockFee, x);
    }

    /// @notice                         mintBridge, storeman mint revoke token on token shadow chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param xHash                    hash of HTLC random number
    function smgMintRevoke(CrossTypes.Data storage storageData, bytes32 xHash)
        external
    {
        storageData.htlcTxData.revokeSmgTx(xHash);

        bytes32 smgID;
        uint tokenPairID;
        uint value;
        (smgID, tokenPairID, value,) = storageData.htlcTxData.getSmgTx(xHash);

        storageData.quota.smgMintRevoke(tokenPairID, smgID, value);

        emit SmgMintRevokeLogger(xHash, smgID, tokenPairID);
    }

    /// @notice                         mintBridge, user mint revoke token on token original chain
    /// @notice                         event invoked by user revoke
    /// @param storageData              Cross storage data
    /// @param xHash                    hash of HTLC random number
    function userMintRevoke(CrossTypes.Data storage storageData, bytes32 xHash)
        external
    {
        bytes32 smgID;
        uint tokenPairID;
        uint lockFee;
        uint value;
        address userOrigAccount;
        (smgID, tokenPairID, value, lockFee, userOrigAccount) = storageData.htlcTxData.getUserTx(xHash);

        uint origChainID;
        uint shadowChainID;
        bytes memory tokenOrigAccount;
        (origChainID, tokenOrigAccount, shadowChainID,) = storageData.tokenManager.getTokenPairInfo(tokenPairID);

        uint revokeFee = storageData.mapRevokeFee[origChainID][shadowChainID];

        storageData.htlcTxData.revokeUserTx(xHash);

        storageData.quota.userMintRevoke(tokenPairID, smgID, value);

        if (revokeFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[smgID] = storageData.mapStoremanFee[smgID].add(revokeFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer{value: revokeFee}(smgID);
            }
        }

        if (lockFee > 0) {
            (payable(userOrigAccount)).transfer(lockFee);
            emit TransferToLogger(userOrigAccount, lockFee);
        }

        uint left = (msg.value).sub(revokeFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);
        if (tokenScAddr == address(0)) {
            (payable(userOrigAccount)).transfer(value);
            emit TransferToLogger(userOrigAccount, value);
        } else {
            // require(IRC20Protocol(tokenScAddr).transfer(userOrigAccount, value), "Transfer token failed");
            require(CrossTypes.transfer(tokenScAddr, userOrigAccount, value), "Transfer token failed");
        }

        emit UserMintRevokeLogger(xHash, smgID, tokenPairID, revokeFee);
    }

}
