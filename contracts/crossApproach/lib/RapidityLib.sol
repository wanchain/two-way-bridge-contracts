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


import "./RapidityTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
// import "../../interfaces/IRC20Protocol.sol";
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
    struct RapidityUserMintParams {
        bytes32 smgID;                      // ID of storeman group which user has selected
        uint tokenPairID;                   // token pair id on cross chain
        uint value;                         // exchange token value
        bytes userShadowAccount;            // account of shadow chain, used to receive token
    }

    /// @notice struct of Rapidity storeman mint lock parameters
    struct RapiditySmgMintParams {
        bytes32 uniqueID;                   // Rapidity random number
        bytes32 smgID;                      // ID of storeman group which user has selected
        uint tokenPairID;                   // token pair id on cross chain
        uint value;                         // exchange token value
        address userShadowAccount;          // account of shadow chain, used to receive token
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapidityUserBurnParams {
        bytes32 smgID;                  // ID of storeman group which user has selected
        uint tokenPairID;               // token pair id on cross chain
        uint value;                     // exchange token value
        bytes userOrigAccount;          // account of token original chain, used to receive token
    }

    /// @notice struct of Rapidity user burn lock parameters
    struct RapiditySmgBurnParams {
        bytes32 uniqueID;               // Rapidity random number
        bytes32 smgID;                  // ID of storeman group which user has selected
        uint tokenPairID;               // token pair id on cross chain
        uint value;                     // exchange token value
        address userOrigAccount;          // account of token original chain, used to receive token
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
    /// @param value                    Rapidity value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserFastMintLogger(bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param userAccount              account of original chain, used to receive token
    event SmgFastMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param userAccount              account of shadow chain, used to receive token
    event UserFastBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes userAccount);

    /// @notice                         event of exchange WRC-20 token with original chain token request
    /// @notice                         event invoked by storeman group
    /// @param uniqueID                 unique random number
    /// @param smgID                    ID of storemanGroup
    /// @param tokenPairID              token pair ID of cross chain token
    /// @param value                    Rapidity value
    /// @param userAccount              account of original chain, used to receive token
    event SmgFastBurnLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice                         mintBridge, user lock token on token original chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user mint lock token on token original chain
    function userFastMint(CrossTypes.Data storage storageData, RapidityUserMintParams memory params)
        public
    {
        uint origChainID;
        uint shadowChainID;
        bytes memory tokenOrigAccount;
        (origChainID,tokenOrigAccount,shadowChainID,) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        storageData.quota.userFastMint(params.tokenPairID, params.smgID, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer{value:lockFee}(params.smgID);
            }
        }

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
        emit UserFastMintLogger(params.smgID, params.tokenPairID, params.value, lockFee, params.userShadowAccount);
    }

    /// @notice                         mintBridge, storeman mint lock token on token shadow chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint lock token on token shadow chain
    function smgFastMint(CrossTypes.Data storage storageData, RapiditySmgMintParams memory params)
        public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgFastMint(params.tokenPairID, params.smgID, params.value);

        storageData.tokenManager.mintToken(params.tokenPairID, params.userShadowAccount, params.value);

        emit SmgFastMintLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.userShadowAccount);
    }

    /// @notice                         burnBridge, user lock token on token original chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user burn lock token on token original chain
    function userFastBurn(CrossTypes.Data storage storageData, RapidityUserBurnParams memory params)
        public
    {
        uint origChainID;
        uint shadowChainID;
        bytes memory tokenShadowAccount;
        (origChainID,,shadowChainID,tokenShadowAccount) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        storageData.quota.userFastBurn(params.tokenPairID, params.smgID, params.value);

        address tokenScAddr = CrossTypes.bytesToAddress(tokenShadowAccount);
        // require(IRC20Protocol(tokenScAddr).transferFrom(msg.sender, this, params.value), "Lock token failed");
        require(CrossTypes.transferFrom(tokenScAddr, msg.sender, address(this), params.value), "Lock token failed");

        storageData.tokenManager.burnToken(params.tokenPairID, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer{value:lockFee}(params.smgID);
            }
        }

        uint left = (msg.value).sub(lockFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        emit UserFastBurnLogger(params.smgID, params.tokenPairID, params.value, lockFee, params.userOrigAccount);
    }

    /// @notice                         burnBridge, storeman burn lock token on token shadow chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn lock token on token shadow chain
    function smgFastBurn(CrossTypes.Data storage storageData, RapiditySmgBurnParams memory params)
        public
    {
        uint origChainID;
        bytes memory tokenOrigAccount;
        (origChainID,tokenOrigAccount,,) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgFastBurn(params.tokenPairID, params.smgID, params.value);

        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);

        if (tokenScAddr == address(0)) {
            (payable(params.userOrigAccount)).transfer(params.value);
        } else {
            // require(IRC20Protocol(tokenScAddr).transfer(params.userOrigAccount, params.value), "Transfer token failed");
            require(CrossTypes.transfer(tokenScAddr, params.userOrigAccount, params.value), "Transfer token failed");
        }

        emit SmgFastBurnLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.userOrigAccount);
    }

}
