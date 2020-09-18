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
import "./lib/RapidityLib.sol";

contract CrossDelegate is CrossStorage, ReentrancyGuard, Halt {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     **/

    event SmgWithdrawFeeLogger(bytes32 indexed smgID, uint timeStamp, address indexed receiver, uint fee);

    /**
     *
     * MODIFIERS
     *
     */

    modifier onlyMeaningfulValue(uint value) {
        require(value != 0, "Value is null");
        _;
    }

    modifier onlyReadySmg(bytes32 smgID) {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,,,,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && now >= startTime && now <= endTime, "PK is not ready");
        _;
    }

    /**
     *
     * MANIPULATIONS
     *
     */

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

    function acquireUnregisteredSmgInfo(bytes32 smgID)
        private
        view
        returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        (,status,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is not unregistered");
    }

    function userFastMint(bytes32 smgID, uint tokenPairID, uint value, bytes userAccount)
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

    function smgFastMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
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

    function userFastBurn(bytes32 smgID, uint tokenPairID, uint value, bytes userAccount)
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

    function smgFastBurn(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, bytes r, bytes32 s)
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

    function getStoremanFee(bytes32 smgID)
        external
        view
        returns(uint fee)
    {
        fee = storageData.mapStoremanFee[smgID];
    }

    function setFees(uint origChainID, uint shadowChainID, uint lockFee, uint revokeFee)
        external
        onlyOwner
    {
        storageData.mapLockFee[origChainID][shadowChainID] = lockFee;
        storageData.mapRevokeFee[origChainID][shadowChainID] = revokeFee;
    }

    function getFees(uint origChainID, uint shadowChainID)
        external
        view
        returns(uint lockFee, uint revokeFee)
    {
        lockFee = storageData.mapLockFee[origChainID][shadowChainID];
        revokeFee = storageData.mapRevokeFee[origChainID][shadowChainID];
    }

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

    function setWithdrawFeeTimeout(uint timeout)
        external
        onlyOwner
    {
        smgFeeReceiverTimeout = timeout;
    }

    function smgWithdrawFee(bytes32 smgID, uint timeStamp, address receiver, bytes r, bytes32 s)
        external
        nonReentrant
    {

        require(now < timeStamp.add(smgFeeReceiverTimeout), "The receiver address expired");

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

    function bytesToBytes32(bytes memory b, uint offset) private pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

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

}
