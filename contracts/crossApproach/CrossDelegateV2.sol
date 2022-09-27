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

pragma solidity ^0.4.25;
pragma experimental ABIEncoderV2;

import "./CrossStorageV2.sol";
import "./lib/HTLCDebtLibV2.sol";
import "./lib/RapidityLibV2.sol";


contract CrossDelegateV2 is CrossStorageV2 {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     **/

    /// @notice                         event of admin config
    /// @param adminAccount             account of admin
    event SetAdmin(address adminAccount);

    /// @notice                         event of setFee or setFees
    /// @param srcChainID               source of cross chain 
    /// @param destChainID              destination of cross chain 
    /// @param contractFee              contract fee 
    /// @param agentFee                 agent fee
    event SetFee(uint srcChainID, uint destChainID, uint contractFee, uint agentFee);

    /// @notice                         event of storeman group ID withdraw the original coin to receiver
    /// @param smgID                    ID of storemanGroup
    /// @param timeStamp                timestamp of the withdraw
    /// @param receiver                 receiver address
    /// @param fee                      shadow coin of the fee which the storeman group pk got it
    event SmgWithdrawFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);
    event WithdrawContractFeeLogger(uint indexed block, uint indexed timeStamp, address indexed receiver, uint fee);

    /**
     *
     * MODIFIERS
     *
     */
    /// @notice                                 check the admin or not
    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

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
        RapidityLibV2.RapidityUserLockParams memory params = RapidityLibV2.RapidityUserLockParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            currentChainID: currentChainID,
            destUserAccount: userAccount
        });
        RapidityLibV2.userLock(storageData, params);
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
        RapidityLibV2.RapidityUserBurnParams memory params = RapidityLibV2.RapidityUserBurnParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            fee: fee,
            currentChainID: currentChainID,
            srcTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });
        RapidityLibV2.userBurn(storageData, params);
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

        RapidityLibV2.RapiditySmgMintParams memory params = RapidityLibV2.RapiditySmgMintParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });
        RapidityLibV2.smgMint(storageData, params);

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

        RapidityLibV2.RapiditySmgReleaseParams memory params = RapidityLibV2.RapiditySmgReleaseParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });
        RapidityLibV2.smgRelease(storageData, params);

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

        HTLCDebtLibV2.DebtAssetParams memory params = HTLCDebtLibV2.DebtAssetParams({
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID
        });
        HTLCDebtLibV2.transferAsset(storageData, params);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, destSmgID));
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

        HTLCDebtLibV2.DebtAssetParams memory params = HTLCDebtLibV2.DebtAssetParams({
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID
        });
        HTLCDebtLibV2.receiveDebt(storageData, params);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, srcSmgID));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param param                        struct of setFee parameter
    function setFee(SetFeesParam param)
        public
        onlyAdmin
    {
        storageData.mapContractFee[param.srcChainID][param.destChainID] = param.contractFee;
        storageData.mapAgentFee[param.srcChainID][param.destChainID] = param.agentFee;
        emit SetFee(param.srcChainID, param.destChainID, param.contractFee, param.agentFee);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param params                        struct of setFees parameter
    function setFees(SetFeesParam [] params) public onlyAdmin {
        for (uint i = 0; i < params.length; ++i) {
            storageData.mapContractFee[params[i].srcChainID][params[i].destChainID] = params[i].contractFee;
            storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID] = params[i].agentFee;
            emit SetFee(params[i].srcChainID, params[i].destChainID, params[i].contractFee, params[i].agentFee);
        }
    }

    function setChainID(uint256 chainID) external onlyAdmin {
        if (currentChainID == 0) {
            currentChainID = chainID;
        }
    }

    function setAdmin(address adminAccount) external onlyOwner {
        admin = adminAccount;
        emit SetAdmin(adminAccount);
    }

    function setUintValue(bytes key, bytes innerKey, uint value) external onlyAdmin {
        return uintData.setStorage(key, innerKey, value);
    }

    function delUintValue(bytes key, bytes innerKey) external onlyAdmin {
        return uintData.delStorage(key, innerKey);
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
        // require(tokenManager != address(0) && smgAdminProxy != address(0) && quota != address(0) && sigVerifier != address(0),
        //     "Parameter is invalid");
        require(tokenManager != address(0) && smgAdminProxy != address(0) && sigVerifier != address(0),
            "Parameter is invalid");

        storageData.smgAdminProxy = IStoremanGroup(smgAdminProxy);
        storageData.tokenManager = ITokenManager(tokenManager);
        storageData.quota = IQuota(quota);
        storageData.smgFeeProxy = smgFeeProxy;
        storageData.sigVerifier = ISignatureVerifier(sigVerifier);
    }

    /// @notice                             withdraw the history fee to foundation account
    /// @param smgIDs                       array of storemanGroup ID
    function smgWithdrawFee(bytes32 [] smgIDs) external {
        uint fee;
        uint currentFee;
        address smgFeeProxy = storageData.smgFeeProxy;
        if (smgFeeProxy == address(0)) {
            smgFeeProxy = owner;
        }
        require(smgFeeProxy != address(0), "invalid smgFeeProxy");

        for (uint i = 0; i < smgIDs.length; ++i) {
            currentFee = storageData.mapStoremanFee[smgIDs[i]];
            delete storageData.mapStoremanFee[smgIDs[i]];
            fee = fee.add(currentFee);
            emit SmgWithdrawFeeLogger(smgIDs[i], block.timestamp, smgFeeProxy, currentFee);
        }
        currentFee = storageData.mapStoremanFee[bytes32(0)];
        if (currentFee > 0) {
            delete storageData.mapStoremanFee[bytes32(0)];
            fee = fee.add(currentFee);
        }
        require(fee > 0, "Fee is null");

        smgFeeProxy.transfer(fee);
        emit WithdrawContractFeeLogger(block.number, block.timestamp, smgFeeProxy, fee);
    }


    /** Get Functions */

    function getUintValue(bytes key, bytes innerKey) public view returns (uint) {
        return uintData.getStorage(key, innerKey);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param smgID                        ID of storemanGroup
    /// @return fee                         original coin the storeman group should get
    function getStoremanFee(bytes32 smgID) external view returns(uint fee) {
        fee = storageData.mapStoremanFee[smgID];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param param                        struct of getFee parameter
    /// @return fees                        struct of getFee return
    function getFee(GetFeesParam param) public view returns(GetFeesReturn fee) {
        fee.contractFee = storageData.mapContractFee[param.srcChainID][param.destChainID];
        fee.agentFee = storageData.mapAgentFee[param.srcChainID][param.destChainID];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param params                       struct of getFees parameter
    /// @return fees                        struct of getFees return
    function getFees(GetFeesParam [] params) public view returns(GetFeesReturn [] fees) {
        fees = new GetFeesReturn[](params.length);
        for (uint i = 0; i < params.length; ++i) {
            fees[i].contractFee = storageData.mapContractFee[params[i].srcChainID][params[i].destChainID];
            fees[i].agentFee = storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID];
        }
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


    /** Private and Internal Functions */

    /// @notice                                 check the storeman group is ready or not
    /// @param smgID                            ID of storeman group
    /// @return curveID                         ID of elliptic curve
    /// @return PK                              PK of storeman group
    function acquireReadySmgInfo(bytes32 smgID)
        internal
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
        internal
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        (,status,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is not unregistered");
    }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    /// @notice             verify signature
    /// @param  curveID     ID of elliptic curve
    /// @param  message     message to be verified
    /// @param  r           Signature info r
    /// @param  s           Signature info s
    function verifySignature(uint curveID, bytes32 message, bytes PK, bytes r, bytes32 s) internal {
        bytes32 PKx = bytesToBytes32(PK, 0);
        bytes32 PKy = bytesToBytes32(PK, 32);

        bytes32 Rx = bytesToBytes32(r, 0);
        bytes32 Ry = bytesToBytes32(r, 32);

        require(storageData.sigVerifier.verify(curveID, s, PKx, PKy, Rx, Ry, message), "Signature verification failed");
    }
}
