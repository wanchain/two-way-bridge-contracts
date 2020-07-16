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

import "../components/Halt.sol";
import "./CrossStorage.sol";
import "./lib/HTLCMintLib.sol";
import "./lib/HTLCBurnLib.sol";
import "./lib/HTLCDebtLib.sol";
import "./lib/RapidityLib.sol";

contract CrossDelegate is CrossStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     **/

    /// @notice                         event of storeman group ID withdraw the original coin to receiver
    /// @param smgID                    ID of storemanGroup
    /// @param timeStamp                timestamp of the withdraw
    /// @param receiver                 receiver address
    /// @param fee                      shadow coin of the fee which the storeman group pk got it
    event SmgWithdrawFeeLogger(bytes32 indexed smgID, uint timeStamp, address indexed receiver, uint fee);

    /**
     *
     * MODIFIERS
     *
     */
    /// @dev Check the sender whether is transaction group admin sc or not
    modifier onlyExternalAccount {
        require(tx.origin == msg.sender, "Contract sender is not allowed");
        _;
    }

    /// @dev Check relevant contract addresses must be initialized before call its method
    modifier initialized {
        require(address(storageData.tokenManager) != address(0) && address(storageData.smgAdminProxy) != address(0) && address(storageData.quota) != address(0) && address(storageData.sigVerifier) != address(0),
                "Invalid parnters");
        _;
    }

    /// @dev Check valid value
    modifier onlyMeaningfulValue(uint value) {
        require(value > 0, "Value is null");
        _;
    }

    /// @notice                                 check the storeman group active
    /// @param smgID                            ID of storeman group
    modifier onlyActiveSmg(bytes32 smgID) {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,,,,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && now >= startTime && now <= endTime, "PK is not active");
        _;
    }

    /// @notice                                 check the storeman group not active
    /// @param smgID                            ID of storeman group
    modifier onlyNotActiveSmg(bytes32 smgID) {
        uint8 status;
        (,status,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is active");
        _;
    }

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice                                 check the storeman group active or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function getSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        (,,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        return (curveID, PK);
    }

    /// @notice                                 check the storeman group active or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireActiveSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && now >= startTime && now <= endTime, "PK is not active");

        return (curveID, PK);
    }

    /// @notice                                 check the storeman group active or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireNotActiveSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        (,status,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is active");
    }

    // /// @notice                                 check the storeman group existing or not
    // /// @param tokenOrigAccount                 account of token supported
    // /// @param storemanGroupPK                  PK of storeman group
    // /// @return bool                           true/false
    // function isSmgExist(GroupStatus status)
    //     private
    //     view
    //     returns (bool)
    // {
    //     return status == GroupStatus.ready || status == GroupStatus.unregistered;
    // }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive WRC20 token
    function userMintLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, bytes32 userAccount)
        external
        payable
        initialized
        notHalted
        onlyExternalAccount
        onlyActiveSmg(smgID)
        onlyMeaningfulValue(value)
    {
        HTLCMintLib.HTLCUserMintLockParams memory params = HTLCMintLib.HTLCUserMintLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: _lockedTime.mul(2),
            userShadowAccount: userAccount,
            tokenManager: storageData.tokenManager
        });

        HTLCMintLib.userMintLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function smgMintRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCMintLib.HTLCSmgMintRedeemParams memory params = HTLCMintLib.HTLCSmgMintRedeemParams({
            x: x,
            smgFeeProxy: storageData.smgFeeProxy
        });
        HTLCMintLib.smgMintRedeem(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function userMintRevoke(bytes32 xHash)
        external
        payable
        initialized
        notHalted
    {
        HTLCMintLib.HTLCUserMintRevokeParams memory params = HTLCMintLib.HTLCUserMintRevokeParams({
            xHash: xHash,
            smgFeeProxy: storageData.smgFeeProxy,
            tokenManager: storageData.tokenManager
        });
        HTLCMintLib.userMintRevoke(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                        address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgMintLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
        external
        initialized
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireActiveSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(xHash, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCMintLib.HTLCSmgMintLockParams memory params = HTLCMintLib.HTLCSmgMintLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: _lockedTime,
            userShadowAccount: userAccount
            // r: r,
            // s: s,
            // tokenManager: storageData.tokenManager,
            // sigVerifier: storageData.sigVerifier,
            // smgFeeProxy: storageData.smgFeeProxy,
            // smgAdminProxy: storageData.smgAdminProxy
        });
        HTLCMintLib.smgMintLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function userMintRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCMintLib.HTLCUserMintRedeemParams memory params = HTLCMintLib.HTLCUserMintRedeemParams({
            x: x,
            tokenManager: storageData.tokenManager
        });
        HTLCMintLib.userMintRedeem(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function smgMintRevoke(bytes32 xHash)
        external
        initialized
        notHalted
    {
        HTLCMintLib.HTLCSmgMintRevokeParams memory params = HTLCMintLib.HTLCSmgMintRevokeParams({
            xHash: xHash
        });
        HTLCMintLib.smgMintRevoke(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userBurnLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, bytes32 userAccount)
        external
        payable
        initialized
        notHalted
        onlyExternalAccount
        onlyActiveSmg(smgID)
        onlyMeaningfulValue(value)
    {
        HTLCBurnLib.HTLCUserBurnLockParams memory params = HTLCBurnLib.HTLCUserBurnLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: _lockedTime.mul(2),
            userOrigAccount: userAccount,
            tokenManager: storageData.tokenManager
        });
        HTLCBurnLib.userBurnLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function smgBurnRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCBurnLib.HTLCSmgBurnRedeemParams memory params = HTLCBurnLib.HTLCSmgBurnRedeemParams({
            x: x,
            smgFeeProxy: storageData.smgFeeProxy,
            tokenManager: storageData.tokenManager
        });
        HTLCBurnLib.smgBurnRedeem(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function userBurnRevoke(bytes32 xHash)
        external
        payable
        initialized
        notHalted
    {
        HTLCBurnLib.HTLCUserBurnRevokeParams memory params = HTLCBurnLib.HTLCUserBurnRevokeParams({
            xHash: xHash,
            smgFeeProxy: storageData.smgFeeProxy,
            tokenManager: storageData.tokenManager
        });
        HTLCBurnLib.userBurnRevoke(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                        address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgBurnLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
        external
        initialized
        notHalted
        onlyExternalAccount
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireActiveSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(xHash, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCBurnLib.HTLCSmgBurnLockParams memory params = HTLCBurnLib.HTLCSmgBurnLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: _lockedTime,
            userOrigAccount: userAccount
        });
        HTLCBurnLib.smgBurnLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function userBurnRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCBurnLib.HTLCUserBurnRedeemParams memory params = HTLCBurnLib.HTLCUserBurnRedeemParams({
            x: x,
            tokenManager: storageData.tokenManager
        });
        HTLCBurnLib.userBurnRedeem(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function smgBurnRevoke(bytes32 xHash)
        external
        initialized
        notHalted
    {
        HTLCBurnLib.HTLCSmgBurnRevokeParams memory params = HTLCBurnLib.HTLCSmgBurnRevokeParams({
            xHash: xHash
        });
        HTLCBurnLib.smgBurnRevoke(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userFastMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, bytes32 userAccount)
        external
        payable
        initialized
        notHalted
        onlyExternalAccount
        onlyActiveSmg(smgID)
        onlyMeaningfulValue(value)
    {
        RapidityLib.RapidityUserMintParams memory params = RapidityLib.RapidityUserMintParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userShadowAccount: userAccount,
            smgFeeProxy: storageData.smgFeeProxy,
            tokenManager: storageData.tokenManager
        });
        RapidityLib.userFastMint(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                        address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgFastMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
        external
        initialized
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireActiveSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(uniqueID, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        RapidityLib.RapiditySmgMintParams memory params = RapidityLib.RapiditySmgMintParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userShadowAccount: userAccount,
            tokenManager: storageData.tokenManager
        });
        RapidityLib.smgFastMint(storageData, params);
    }


    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userFastBurn(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, bytes32 userAccount)
        external
        payable
        initialized
        notHalted
        onlyExternalAccount
        onlyActiveSmg(smgID)
        onlyMeaningfulValue(value)
    {
        RapidityLib.RapidityUserBurnParams memory params = RapidityLib.RapidityUserBurnParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userOrigAccount: userAccount,
            smgFeeProxy: storageData.smgFeeProxy,
            tokenManager: storageData.tokenManager
        });
        RapidityLib.userFastBurn(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                        address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgFastBurn(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
        external
        initialized
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireActiveSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(uniqueID, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        RapidityLib.RapiditySmgBurnParams memory params = RapidityLib.RapiditySmgBurnParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userOrigAccount: userAccount,
            tokenManager: storageData.tokenManager
        });
        RapidityLib.smgFastBurn(storageData, params);
    }

    /// @notice                                 lock storeman debt
    /// @param  xHash                           hash of HTLC random number
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function srcDebtLock(bytes32 xHash, bytes32 srcSmgID, bytes32 destSmgID, bytes r, bytes32 s)
        external
        initialized
        notHalted
        onlyActiveSmg(destSmgID)
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireNotActiveSmgInfo(srcSmgID);

        bytes32 mHash = sha256(abi.encode(xHash, destSmgID));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCDebtLib.HTLCDebtLockParams memory params = HTLCDebtLib.HTLCDebtLockParams({
            xHash: xHash,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
            lockedTime: _lockedTime.mul(2)
        });
        HTLCDebtLib.srcDebtLock(storageData, params);
    }

    /// @notice                                 redeem debt, destination storeman group takes over the debt of source storeman group
    /// @param  x                               HTLC random number
    function destDebtRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCDebtLib.HTLCDebtRedeemParams memory params = HTLCDebtLib.HTLCDebtRedeemParams({
            x: x
        });
        HTLCDebtLib.destDebtRedeem(storageData, params);
    }

    /// @notice                                 source storeman group revoke the debt on asset chain
    /// @param  xHash                           hash of HTLC random number
    function srcDebtRevoke(bytes32 xHash)
        external
        initialized
        notHalted
    {
        HTLCDebtLib.HTLCDebtRevokeParams memory params = HTLCDebtLib.HTLCDebtRevokeParams({
            xHash: xHash
        });
        HTLCDebtLib.srcDebtRevoke(storageData, params);
    }

    /// @notice                                 lock storeman debt
    /// @param  xHash                           hash of HTLC random number
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function destDebtLock(bytes32 xHash, bytes32 srcSmgID, bytes32 destSmgID, bytes r, bytes32 s)
        external
        initialized
        notHalted
        onlyNotActiveSmg(srcSmgID)
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireActiveSmgInfo(destSmgID);

        bytes32 mHash = sha256(abi.encode(xHash, srcSmgID));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCDebtLib.HTLCDebtLockParams memory params = HTLCDebtLib.HTLCDebtLockParams({
            xHash: xHash,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
            lockedTime: _lockedTime
        });
        HTLCDebtLib.destDebtLock(storageData, params);
    }

    /// @notice                                 redeem debt, destination storeman group takes over the debt of source storeman group
    /// @param  x                               HTLC random number
    function srcDebtRedeem(bytes32 x)
        external
        initialized
        notHalted
    {
        HTLCDebtLib.HTLCDebtRedeemParams memory params = HTLCDebtLib.HTLCDebtRedeemParams({
            x: x
        });
        HTLCDebtLib.srcDebtRedeem(storageData, params);
    }

    /// @notice                                 source storeman group revoke the debt on debt chain
    /// @param  xHash                           hash of HTLC random number
    function destDebtRevoke(bytes32 xHash)
        external
        initialized
        notHalted
    {
        HTLCDebtLib.HTLCDebtRevokeParams memory params = HTLCDebtLib.HTLCDebtRevokeParams({
            xHash: xHash
        });
        HTLCDebtLib.destDebtRevoke(storageData, params);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param smgID                        ID of storemanGroup
    /// @return fee                         original coin the storeman group should get
    function getStoremanFee(bytes32 smgID)
        external
        view
        returns(uint)
    {
        return storageData.mapStoremanFee[smgID];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param origChainID                  ID of token original chain
    /// @param shadowChainID                ID of token shadow chain
    /// @param lockFee                      Coin the storeman group should get while storeman redeem user lock
    /// @param revokeFee                    Coin the storeman group should get while user revoke its lock
    function setFees(uint origChainID, uint shadowChainID, uint lockFee, uint revokeFee)
        external
        onlyOwner
    {
        storageData.mapLockFee[origChainID][shadowChainID] = lockFee;
        storageData.mapRevokeFee[origChainID][shadowChainID] = revokeFee;
    }

    /// @notice                             get the fee of the storeman group should get
    /// @return lockFee                     Coin the storeman group should get while storeman redeem user lock
    /// @return revokeFee                   Coin the storeman group should get while user revoke its lock
    function getFees(uint origChainID, uint shadowChainID)
        external
        view
        returns(uint, uint)
    {
        return (storageData.mapLockFee[origChainID][shadowChainID], storageData.mapRevokeFee[origChainID][shadowChainID]);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param lockedTime                   Coin the storeman group should get while storeman redeem user lock
    function setLockedTime(uint lockedTime)
        external
        onlyOwner
    {
        _lockedTime = lockedTime;
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param  xHash                       hash of HTLC random number
    /// @return leftLockTime                left time of locked transaction
    function getLeftLockedTime(bytes32 xHash) external view returns (uint) {
        return storageData.htlcTxData.getLeftLockedTime(xHash);
    }

    /// @notice                             update the initialized state value of this contract
    /// @param tokenManager                 address of the token manager
    /// @param smgAdminProxy                address of the storeman group admin
    /// @param smgFeeProxy                  address of the proxy to store fee for storeman group
    /// @param quota                        address of the quota
    /// @param sigVerifier                  address of the signature verifier
    function setPartners(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier)
        external
        onlyOwner
    {
        require(tokenManager != address(0) && smgAdminProxy != address(0) && quota != address(0) && sigVerifier != address(0),
            "Parameter is invalid");

        storageData.smgAdminProxy = ISmgAdminProxy(smgAdminProxy);
        storageData.tokenManager = ITokenManager(tokenManager);
        storageData.quota = IQuota(quota);
        storageData.smgFeeProxy = smgFeeProxy;
        storageData.sigVerifier = ISignatureVerifier(sigVerifier);
    }

    /// @notice                             get the initialized state value of this contract
    /// @return tokenManager                address of the token manager
    /// @return smgAdminProxy               address of the storeman group admin
    /// @return smgFeeProxy                 address of the proxy to store fee for storeman group
    /// @return quota                       address of the quota
    /// @return sigVerifier                 address of the signature verifier
    function getPartners() external view returns(address, address, address, address, address) {
        return (address(storageData.tokenManager), address(storageData.smgAdminProxy),
                storageData.smgFeeProxy, address(storageData.quota), address(storageData.sigVerifier));
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param timeout                      Timeout for storeman group receiver withdraw fee, uint second
    function setWithdrawFeeTimeout(uint timeout)
        external
        onlyOwner
    {
        _smgFeeReceiverTimeout = timeout;
    }

    /// @notice                             storeman group withdraw the fee to receiver account
    /// @param smgID                        ID of the storeman group
    /// @param receiver                     account of the receiver
    /// @param r                            signature
    /// @param s                            signature
    function smgWithdrawFee(bytes32 smgID, uint timeStamp, address receiver, bytes r, bytes32 s) external {

        require(now < timeStamp.add(_smgFeeReceiverTimeout), "The receiver address expired");

        uint curveID;
        bytes memory PK;
        (,,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);
        verifySignature(curveID, sha256(abi.encode(timeStamp, receiver)), PK, r, s);

        uint fee = storageData.mapStoremanFee[smgID];

        require(fee > 0, "Fee is null");

        delete storageData.mapStoremanFee[smgID];
        receiver.transfer(fee);

        emit SmgWithdrawFeeLogger(smgID, now, receiver, fee);
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
          out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }

    /// @notice             verify signature
    /// @param  curveID     ID of elliptic curve
    /// @param  message     message to be verified
    /// @param  r           Signature info r
    /// @param  s           Signature info s
    /// @return             true/false
    function verifySignature(uint curveID, bytes32 message, bytes PK, bytes r, bytes32 s)
        internal
        // view
    {
        bytes32 PKx = bytesToBytes32(PK, 1);
        bytes32 PKy = bytesToBytes32(PK, 33);

        bytes32 Rx = bytesToBytes32(r, 1);
        bytes32 Ry = bytesToBytes32(r, 33);

        require(storageData.sigVerifier.verify(curveID, s, PKx, PKy, Rx, Ry, message), "Signature verification failed");
    }

    // /// @notice                              get the detailed quota info. of this storeman group
    // /// @param smgID                         ID of storemanGroup
    // /// @param tokenPairID                   token pair ID of cross chain token
    // /// @return _quota                       storemanGroup's total quota
    // /// @return mintBridgeQuota              inbound, the amount which storeman group can handle
    // /// @return BurnBridgeQuota              outbound, the amount which storeman group can handle
    // /// @return _receivable                  amount of original token to be received, equals to amount of WAN token to be minted
    // /// @return _payable                     amount of WAN token to be burnt
    // /// @return _debt                        amount of original token has been exchanged to the wanchain
    // function queryStoremanGroupQuota(bytes32 smgID, uint tokenPairID)
    //     external
    //     view
    //     returns(uint, uint, uint, uint, uint, uint)
    // {
    //     return storageData.quotaData.queryQuotaInfo(smgID, tokenPairID);
    // }
}
