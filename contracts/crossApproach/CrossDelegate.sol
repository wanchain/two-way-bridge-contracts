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
import "../components/ReentrancyGuard.sol";
import "./CrossStorage.sol";
import "./lib/HTLCDebtLib.sol";
import "./lib/RapidityLib.sol";


contract CrossDelegate is CrossStorage, ReentrancyGuard, Halt {
    using SafeMath for uint;
    bytes constant currentChainIDKey = "current";
    bytes constant currentChainIDInnerKey = "chainID";

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

    /// @notice                                 check the storeman group is ready
    /// @param smgID                            ID of storeman group
    modifier onlyReadySmg(bytes32 smgID) {
        uint8 status;
        uint startTime;
        uint endTime;
        (status,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupStatus(smgID);

        require(status == uint8(GroupStatus.ready) && now >= startTime && now <= endTime, "PK is not ready");
        _;
    }


    /**
     *
     * MANIPULATIONS
     *
     */

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

        require(status == uint8(GroupStatus.ready) && now >= startTime && now <= endTime, "PK is not ready");

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

    /// @notice                                 request exchange orignal coin or token with WRC20 on wanchain
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain coin/token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive shadow chain token
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes userAccount)
        external
        payable
        notHalted
        onlyReadySmg(smgID)
    {
        RapidityLib.RapidityUserLockParams memory params = RapidityLib.RapidityUserLockParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            userShadowAccount: userAccount
        });
        RapidityLib.userLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes userAccount)
        external
        payable
        notHalted
        onlyReadySmg(smgID)
    {
        RapidityLib.RapidityUserBurnParams memory params = RapidityLib.RapidityUserBurnParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            fee: fee,
            shadowTokenAccount: tokenAccount,
            userOrigAccount: userAccount
        });
        RapidityLib.userBurn(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address tokenAccount, address userAccount, bytes r, bytes32 s)
        external
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLib.RapiditySmgMintParams memory params = RapidityLib.RapiditySmgMintParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            shadowTokenAccount: tokenAccount,
            userShadowAccount: userAccount
        });
        RapidityLib.smgMint(storageData, params);

        uint currentChainID = getUintValue(currentChainIDKey, currentChainIDInnerKey);
        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     address of user, used to receive original token/coin
    /// @param  r                               signature
    /// @param  s                               signature
    function smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address tokenAccount, address userAccount, bytes r, bytes32 s)
        external
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLib.RapiditySmgReleaseParams memory params = RapidityLib.RapiditySmgReleaseParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            origTokenAccount: tokenAccount,
            userOrigAccount: userAccount
        });
        RapidityLib.smgRelease(storageData, params);

        uint currentChainID = getUintValue(currentChainIDKey, currentChainIDInnerKey);
        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                                 transfer storeman asset
    /// @param  uniqueID                        random number (likes old xHash)
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function transferAsset(bytes32 uniqueID, bytes32 srcSmgID, bytes32 destSmgID, bytes r, bytes32 s)
        external
        notHalted
        onlyReadySmg(destSmgID)
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireUnregisteredSmgInfo(srcSmgID);

        HTLCDebtLib.DebtAssetParams memory params = HTLCDebtLib.DebtAssetParams({
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID
        });
        HTLCDebtLib.transferAsset(storageData, params);

        bytes32 mHash = sha256(abi.encode(getUintValue(currentChainIDKey, currentChainIDInnerKey), uniqueID, destSmgID));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                                 receive storeman debt
    /// @param  uniqueID                        random number (likes old xHash)
    /// @param  srcSmgID                        ID of src storeman
    /// @param  destSmgID                       ID of dst storeman
    /// @param  r                               signature
    /// @param  s                               signature
    function receiveDebt(bytes32 uniqueID, bytes32 srcSmgID, bytes32 destSmgID, bytes r, bytes32 s)
        external
        notHalted 
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(destSmgID);

        HTLCDebtLib.DebtAssetParams memory params = HTLCDebtLib.DebtAssetParams({
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID
        });
        HTLCDebtLib.receiveDebt(storageData, params);

        uint currentChainID = getUintValue(currentChainIDKey, currentChainIDInnerKey);
        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, srcSmgID));
        verifySignature(curveID, mHash, PK, r, s);
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
    /// @return leftLockTime                left time of locked transaction
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
    function smgWithdrawFee(bytes32 smgID, uint timeStamp, address receiver, bytes r, bytes32 s)
        external
        nonReentrant
    {
        require(now < timeStamp.add(smgFeeReceiverTimeout), "The receiver address expired");

        uint fee = storageData.mapStoremanFee[smgID];

        require(fee > 0, "Fee is null");

        delete storageData.mapStoremanFee[smgID];
        receiver.transfer(fee);

        uint curveID;
        bytes memory PK;
        (,,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);
        uint currentChainID = getUintValue(currentChainIDKey, currentChainIDInnerKey);
        verifySignature(curveID, sha256(abi.encode(currentChainID, timeStamp, receiver)), PK, r, s);

        emit SmgWithdrawFeeLogger(smgID, now, receiver, fee);
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
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
    function verifySignature(uint curveID, bytes32 message, bytes PK, bytes r, bytes32 s)
        private
        // view
    {
        bytes32 PKx = bytesToBytes32(PK, 0);
        bytes32 PKy = bytesToBytes32(PK, 32);

        bytes32 Rx = bytesToBytes32(r, 0);
        bytes32 Ry = bytesToBytes32(r, 32);

        require(storageData.sigVerifier.verify(curveID, s, PKx, PKy, Rx, Ry, message), "Signature verification failed");
    }

    /* uintData */
    function setUintValue(bytes key, bytes innerKey, uint value)
        external
        onlyOwner
    {
        return uintData.setStorage(key, innerKey, value);
    }

    function getUintValue(bytes key, bytes innerKey)
        public
        view
        returns (uint)
    {
        return uintData.getStorage(key, innerKey);
    }

    function delUintValue(bytes key, bytes innerKey)
        external
        onlyOwner
    {
        return uintData.delStorage(key, innerKey);
    }

}
