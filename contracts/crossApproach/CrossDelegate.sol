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
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../components/Halt.sol";
import "../components/ReentrancyGuard.sol";
import "./CrossStorage.sol";
import "./lib/HTLCMintLib.sol";
import "./lib/HTLCBurnLib.sol";
import "./lib/HTLCDebtLib.sol";
import "./lib/RapidityLib.sol";
import "./lib/HTLCTxLib.sol";

contract CrossDelegate is CrossStorage, ReentrancyGuard, Halt {
    using SafeMath for uint;
    using HTLCTxLib for HTLCTxLib.Data;

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
    /// @dev Check valid value
    modifier onlyMeaningfulValue(uint value) {
        require(value != 0, "Value is null");
        _;
    }

    /// @notice                                 check the storeman group is ready
    /// @param smgID                            ID of storeman group
    modifier onlyReadySmg(bytes32 smgID) {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,,,,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");
        _;
    }


    // function _checkValue(uint value) private view {
    //     require(value != 0, "Value is null");
    // }

    // function _checkReadySmg(bytes32 smgID) private view {
    //     uint8 status;
    //     uint startTime;
    //     uint endTime;
    //     (,status,,,,,,,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

    //     require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");
    // }

    // function _checkUnregisteredSmg(bytes32 smgID) private view {
    //     uint8 status;
    //     (,status,,,,,,,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

    //     require(status == uint8(GroupStatus.unregistered), "PK is not unregistered");
    // }

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice                                 get the exist storeman group info
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireExistSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint origChainID;
        (,,,origChainID,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);
        require(origChainID != 0, "PK does not exist");

        return (curveID, PK);
    }

    /// @notice                                 check the storeman group is ready or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireReadySmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");

        return (curveID, PK);
    }

    /// @notice                                 get the unregistered storeman group info
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireUnregisteredSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        (,status,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is not unregistered");
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive WRC20 token
    function userMintLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
        external
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
        onlyMeaningfulValue(value)
    {
        HTLCMintLib.HTLCUserMintLockParams memory params = HTLCMintLib.HTLCUserMintLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: lockedTime.mul(2),
            userShadowAccount: userAccount
        });

        HTLCMintLib.userMintLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgMintLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes calldata r, bytes32 s)
        external
        notHalted
        nonReentrant
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(xHash, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCMintLib.HTLCSmgMintLockParams memory params = HTLCMintLib.HTLCSmgMintLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: lockedTime,
            userShadowAccount: userAccount
        });
        HTLCMintLib.smgMintLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function userMintRedeem(bytes32 x)
        external
        notHalted
        nonReentrant
    {
        HTLCMintLib.userMintRedeem(storageData, x);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function smgMintRedeem(bytes32 x)
        external
        notHalted
        nonReentrant
    {
        HTLCMintLib.smgMintRedeem(storageData, x);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function smgMintRevoke(bytes32 xHash)
        external
        notHalted
        nonReentrant
    {
        HTLCMintLib.smgMintRevoke(storageData, xHash);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function userMintRevoke(bytes32 xHash)
        external
        payable
        notHalted
        nonReentrant
    {
        HTLCMintLib.userMintRevoke(storageData, xHash);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userBurnLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
        external
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
        onlyMeaningfulValue(value)
    {
        HTLCBurnLib.HTLCUserBurnLockParams memory params = HTLCBurnLib.HTLCUserBurnLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: lockedTime.mul(2),
            userOrigAccount: userAccount
        });
        HTLCBurnLib.userBurnLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgBurnLock(bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes calldata r, bytes32 s)
        external
        notHalted
        nonReentrant
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(xHash, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCBurnLib.HTLCSmgBurnLockParams memory params = HTLCBurnLib.HTLCSmgBurnLockParams({
            xHash: xHash,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            lockedTime: lockedTime,
            userOrigAccount: userAccount
        });
        HTLCBurnLib.smgBurnLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function userBurnRedeem(bytes32 x)
        external
        notHalted
        nonReentrant
    {
        HTLCBurnLib.userBurnRedeem(storageData, x);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  x                               HTLC random number
    function smgBurnRedeem(bytes32 x)
        external
        notHalted
        nonReentrant
    {
        HTLCBurnLib.smgBurnRedeem(storageData, x);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function smgBurnRevoke(bytes32 xHash)
        external
        notHalted
        nonReentrant
    {
        HTLCBurnLib.smgBurnRevoke(storageData, xHash);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  xHash                           hash of HTLC random number
    function userBurnRevoke(bytes32 xHash)
        external
        payable
        notHalted
        nonReentrant
    {
        HTLCBurnLib.userBurnRevoke(storageData, xHash);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive shadow chain token
    function userFastMint(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
        external
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
        onlyMeaningfulValue(value)
    {
        RapidityLib.RapidityUserMintParams memory params = RapidityLib.RapidityUserMintParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userShadowAccount: userAccount
        });
        RapidityLib.userFastMint(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgFastMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes calldata r, bytes32 s)
        external
        notHalted
        nonReentrant
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireExistSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(uniqueID, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        RapidityLib.RapiditySmgMintParams memory params = RapidityLib.RapiditySmgMintParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userShadowAccount: userAccount
        });
        RapidityLib.smgFastMint(storageData, params);
    }


    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userFastBurn(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
        external
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
        onlyMeaningfulValue(value)
    {
        RapidityLib.RapidityUserBurnParams memory params = RapidityLib.RapidityUserBurnParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userOrigAccount: userAccount
        });
        RapidityLib.userFastBurn(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive original token/coin
    /// @param  r                               signature
    /// @param  s                               signature
    function smgFastBurn(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes calldata r, bytes32 s)
        external
        notHalted
        nonReentrant
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireExistSmgInfo(smgID);

        bytes32 mHash = sha256(abi.encode(uniqueID, tokenPairID, value, userAccount));
        verifySignature(curveID, mHash, PK, r, s);

        RapidityLib.RapiditySmgBurnParams memory params = RapidityLib.RapiditySmgBurnParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userOrigAccount: userAccount
        });
        RapidityLib.smgFastBurn(storageData, params);
    }

    /// @notice                                 lock storeman debt
    /// @param  xHash                           hash of HTLC random number
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function srcDebtLock(bytes32 xHash, bytes32 srcSmgID, bytes32 destSmgID, bytes calldata r, bytes32 s)
        external
        notHalted
        onlyReadySmg(destSmgID)
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireUnregisteredSmgInfo(srcSmgID);

        bytes32 mHash = sha256(abi.encode(xHash, destSmgID));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCDebtLib.HTLCDebtLockParams memory params = HTLCDebtLib.HTLCDebtLockParams({
            xHash: xHash,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
            lockedTime: lockedTime.mul(2)
        });
        HTLCDebtLib.srcDebtLock(storageData, params);
    }

    /// @notice                                 lock storeman debt
    /// @param  xHash                           hash of HTLC random number
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function destDebtLock(bytes32 xHash, bytes32 srcSmgID, bytes32 destSmgID, bytes calldata r, bytes32 s)
        external
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(destSmgID);

        bytes32 mHash = sha256(abi.encode(xHash, srcSmgID));
        verifySignature(curveID, mHash, PK, r, s);

        HTLCDebtLib.HTLCDebtLockParams memory params = HTLCDebtLib.HTLCDebtLockParams({
            xHash: xHash,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
            lockedTime: lockedTime
        });
        HTLCDebtLib.destDebtLock(storageData, params);
    }

    /// @notice                                 redeem debt, destination storeman group takes over the debt of source storeman group
    /// @param  x                               HTLC random number
    function srcDebtRedeem(bytes32 x)
        external
        notHalted
    {
        HTLCDebtLib.srcDebtRedeem(storageData, x);
    }

    /// @notice                                 redeem debt, destination storeman group takes over the debt of source storeman group
    /// @param  x                               HTLC random number
    function destDebtRedeem(bytes32 x)
        external
        notHalted
    {
        HTLCDebtLib.destDebtRedeem(storageData, x);
    }

    /// @notice                                 source storeman group revoke the debt on debt chain
    /// @param  xHash                           hash of HTLC random number
    function destDebtRevoke(bytes32 xHash)
        external
        notHalted
    {
        HTLCDebtLib.destDebtRevoke(storageData, xHash);
    }

    /// @notice                                 source storeman group revoke the debt on asset chain
    /// @param  xHash                           hash of HTLC random number
    function srcDebtRevoke(bytes32 xHash)
        external
        notHalted
    {
        HTLCDebtLib.srcDebtRevoke(storageData, xHash);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param smgID                        ID of storemanGroup
    /// @return fee                         original coin the storeman group should get
    function getStoremanFee(bytes32 smgID)
        external
        view
        returns(uint fee)
    {
        fee = storageData.mapStoremanFee[smgID];
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
    /// @param origChainID                  Original chain ID
    /// @param shadowChainID                Shadow Chain ID
    /// @return lockFee                     Coin the storeman group should get while storeman redeem user lock
    /// @return revokeFee                   Coin the storeman group should get while user revoke its lock
    function getFees(uint origChainID, uint shadowChainID)
        external
        view
        returns(uint lockFee, uint revokeFee)
    {
        lockFee = storageData.mapLockFee[origChainID][shadowChainID];
        revokeFee = storageData.mapRevokeFee[origChainID][shadowChainID];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param time                         Coin the storeman group should get while storeman redeem user lock
    function setLockedTime(uint time)
        external
        onlyOwner
    {
        lockedTime = time;
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param  xHash                       hash of HTLC random number
    /// @return leftLockedTime              left time of locked transaction
    function getLeftLockedTime(bytes32 xHash) external view returns (uint leftLockedTime) {
        leftLockedTime = storageData.htlcTxData.getLeftLockedTime(xHash);
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

        storageData.smgAdminProxy = IStoremanGroup(smgAdminProxy);
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
    function getPartners()
        external
        view
        returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier)
    {
        tokenManager = address(storageData.tokenManager);
        smgAdminProxy = address(storageData.smgAdminProxy);
        smgFeeProxy = storageData.smgFeeProxy;
        quota = address(storageData.quota);
        sigVerifier = address(storageData.sigVerifier);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param timeout                      Timeout for storeman group receiver withdraw fee, uint second
    function setWithdrawFeeTimeout(uint timeout)
        external
        onlyOwner
    {
        smgFeeReceiverTimeout = timeout;
    }

    /// @notice                             storeman group withdraw the fee to receiver account
    /// @param smgID                        ID of the storeman group
    /// @param receiver                     account of the receiver
    /// @param r                            signature
    /// @param s                            signature
    function smgWithdrawFee(bytes32 smgID, uint timeStamp, address receiver, bytes calldata r, bytes32 s)
        external
        nonReentrant
    {

        require(block.timestamp < timeStamp.add(smgFeeReceiverTimeout), "The receiver address expired");

        uint curveID;
        bytes memory PK;
        (,,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);
        verifySignature(curveID, sha256(abi.encode(timeStamp, receiver)), PK, r, s);

        uint fee = storageData.mapStoremanFee[smgID];

        require(fee > 0, "Fee is null");

        delete storageData.mapStoremanFee[smgID];
        (payable(receiver)).transfer(fee);

        emit SmgWithdrawFeeLogger(smgID, block.timestamp, receiver, fee);
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    // function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
    //     bytes32 out;

    //     for (uint i = 0; i < 32; i++) {
    //       out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
    //     }
    //     return out;
    // }
    function bytesToBytes32(bytes memory b, uint offset) private pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    /// @notice             verify signature
    /// @param  curveID     ID of elliptic curve
    /// @param  message     message to be verified
    /// @param  r           Signature info r
    /// @param  s           Signature info s
    function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes calldata r, bytes32 s)
        private
        // view
    {
        // bytes32 PKx = bytesToBytes32(PK, 0);
        // bytes32 PKy = bytesToBytes32(PK, 32);

        // bytes32 Rx = bytesToBytes32(r, 0);
        // bytes32 Ry = bytesToBytes32(r, 32);

        require(storageData.sigVerifier.verify(curveID, s, bytesToBytes32(PK, 0), bytesToBytes32(PK, 32), bytesToBytes32(r, 0), bytesToBytes32(r, 32), message), "Signature verification failed");
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
