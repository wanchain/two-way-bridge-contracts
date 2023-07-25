// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

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

pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../components/Halt.sol";
import "./CrossStorageV4.sol";
import "./lib/RapidityLibV4.sol";
import "./lib/NFTLibV1.sol";
// import "./lib/NFTLibV1.sol";

contract CrossDelegateV4 is Initializable, ReentrancyGuard, Halt, CrossStorageV4 {
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
    event SetFee(uint indexed srcChainID, uint indexed destChainID, uint contractFee, uint agentFee);

    /// @notice                         event of setFee or setFees
    /// @param tokenPairID              ID of token pair
    /// @param contractFee              contract fee
    event SetTokenPairFee(uint indexed tokenPairID, uint contractFee);

    /// @notice                         event of storeman group ID withdraw the original coin to receiver
    /// @param smgID                    ID of storeman group
    /// @param timeStamp                timestamp of the withdraw
    /// @param receiver                 receiver address
    /// @param fee                      shadow coin of the fee which the storeman group pk got it
    event WithdrawHistoryFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);

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

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");
        _;
    }

    /* initializer */
    function initialize() external initializer {
        owner = msg.sender;
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
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
    external
    payable
    notHalted
    nonReentrant
    onlyReadySmg(smgID)
    {
        address smgFeeProxy = getSmgFeeProxy();

        RapidityLibV4.RapidityUserLockParams memory params = RapidityLibV4.RapidityUserLockParams({
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        currentChainID: currentChainID,
        tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
        etherTransferGasLimit: getEtherTransferGasLimit(),
        destUserAccount: userAccount,
        smgFeeProxy: smgFeeProxy
        });
        RapidityLibV4.userLock(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  userAccount                     account of user, used to receive original chain token
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount)
    external
    payable
    notHalted
    nonReentrant
    onlyReadySmg(smgID)
    {
        address smgFeeProxy = getSmgFeeProxy();

        RapidityLibV4.RapidityUserBurnParams memory params = RapidityLibV4.RapidityUserBurnParams({
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        currentChainID: currentChainID,
        tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
        etherTransferGasLimit: getEtherTransferGasLimit(),
        srcTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: smgFeeProxy
        });
        RapidityLibV4.userBurn(storageData, params);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  fee                             exchange fee
    /// @param  userAccount                     address of user, used to receive WRC20 token
    /// @param  r                               signature
    /// @param  s                               signature
    function smgMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
    external
    notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLibV4.RapiditySmgMintParams memory params = RapidityLibV4.RapiditySmgMintParams({
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        destTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: (storageData.smgFeeProxy == address(0)) ? owner : storageData.smgFeeProxy // fix: Stack too deep
        });
        RapidityLibV4.smgMint(storageData, params);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                                 request exchange RC20 token with WRC20 on wanchain
    /// @param  uniqueID                        fast cross chain random number
    /// @param  smgID                           ID of storeman
    /// @param  tokenPairID                     token pair ID of cross chain token
    /// @param  value                           exchange value
    /// @param  fee                             exchange fee
    /// @param  userAccount                     address of user, used to receive original token/coin
    /// @param  r                               signature
    /// @param  s                               signature
    function smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
    external
    notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLibV4.RapiditySmgReleaseParams memory params = RapidityLibV4.RapiditySmgReleaseParams({
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        etherTransferGasLimit: getEtherTransferGasLimit(),
        destTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: (storageData.smgFeeProxy == address(0)) ? owner : storageData.smgFeeProxy // fix: Stack too deep
        });
        RapidityLibV4.smgRelease(storageData, params);

        bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /// @notice                             set the fee of the storeman group should get
    /// @param param                        struct of setFee parameter
    function setFee(SetFeesParam calldata param) public onlyAdmin {
        storageData.mapContractFee[param.srcChainID][param.destChainID] = param.contractFee;
        storageData.mapAgentFee[param.srcChainID][param.destChainID] = param.agentFee;
        emit SetFee(param.srcChainID, param.destChainID, param.contractFee, param.agentFee);
    }

    /// @notice                             set the fee of the storeman group should get
    /// @param params                        struct of setFees parameter
    function setFees(SetFeesParam [] calldata params) public onlyAdmin {
        for (uint i = 0; i < params.length; ++i) {
            storageData.mapContractFee[params[i].srcChainID][params[i].destChainID] = params[i].contractFee;
            storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID] = params[i].agentFee;
            emit SetFee(params[i].srcChainID, params[i].destChainID, params[i].contractFee, params[i].agentFee);
        }
    }

    /// @notice                             set the fee of the storeman group should get
    /// @param tokenPairID                  ID of token pair
    /// @param contractFee                  contractFee of token pair
    function setTokenPairFee(uint256 tokenPairID, uint256 contractFee) external onlyAdmin {
        mapTokenPairContractFee[tokenPairID] = contractFee;
        emit SetTokenPairFee(tokenPairID, contractFee);
    }

    /// @notice                             set the fee of the storeman group should get
    /// @param params                       struct of setTokenPairFees parameter
    function setTokenPairFees(SetTokenPairFeesParam [] calldata params) public onlyAdmin {
        for (uint i = 0; i < params.length; ++i) {
            mapTokenPairContractFee[params[i].tokenPairID] = params[i].contractFee;
            emit SetTokenPairFee(params[i].tokenPairID, params[i].contractFee);
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

    function setUintValue(bytes calldata key, bytes calldata innerKey, uint value) external onlyAdmin {
        return BasicStorageLib.setStorage(uintData, key, innerKey, value);
    }

    function delUintValue(bytes calldata key, bytes calldata innerKey) external onlyAdmin {
        return BasicStorageLib.delStorage(uintData, key, innerKey);
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
        // storageData.quota = IQuota(quota);
        storageData.smgFeeProxy = smgFeeProxy;
        storageData.sigVerifier = ISignatureVerifier(sigVerifier);
    }


    /// @notice                             withdraw the history fee to foundation account
    /// @param smgIDs                       array of storemanGroup ID
    function smgWithdrawHistoryFee(bytes32 [] calldata smgIDs) external {
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
            emit WithdrawHistoryFeeLogger(smgIDs[i], block.timestamp, smgFeeProxy, currentFee);
        }
        if (fee > 0) {
            payable(smgFeeProxy).transfer(fee);
        }
    }


    /** Get Functions */

    function getUintValue(bytes calldata key, bytes calldata innerKey) public view returns (uint) {
        return BasicStorageLib.getStorage(uintData, key, innerKey);
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param key                          key of storeman fee
    /// @return fee                         original coin the storeman group should get
    function getStoremanFee(bytes32 key) external view returns(uint fee) {
        fee = storageData.mapStoremanFee[key];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param param                        struct of getFee parameter
    /// @return fee                        struct of getFee return
    function getFee(GetFeesParam calldata param) public view returns(GetFeesReturn memory fee) {
        fee.contractFee = storageData.mapContractFee[param.srcChainID][param.destChainID];
        fee.agentFee = storageData.mapAgentFee[param.srcChainID][param.destChainID];
    }

    /// @notice                             get the fee of the storeman group should get
    /// @param params                       struct of getFees parameter
    /// @return fees                        struct of getFees return
    function getFees(GetFeesParam [] calldata params) public view returns(GetFeesReturn [] memory fees) {
        fees = new GetFeesReturn[](params.length);
        for (uint i = 0; i < params.length; ++i) {
            fees[i].contractFee = storageData.mapContractFee[params[i].srcChainID][params[i].destChainID];
            fees[i].agentFee = storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID];
        }
    }

    /// @notice                             get the token pair fee of the storeman group should get
    /// @param tokenPairID                  ID of token pair
    /// @return contractFee                 contractFee of token pair
    function getTokenPairFee(uint256 tokenPairID) external view returns(uint256 contractFee) {
        contractFee = mapTokenPairContractFee[tokenPairID];
    }

    /// @notice                             get the token pair fees of the storeman group should get
    /// @param tokenPairIDs                 array of tokenPairID
    /// @return contractFees                array of tokenPair contractFee
    function getTokenPairFees(uint256[] calldata tokenPairIDs) external view returns(uint256 [] memory contractFees) {
        contractFees = new uint256[](tokenPairIDs.length);
        for (uint i = 0; i < tokenPairIDs.length; ++i) {
            contractFees[i] = mapTokenPairContractFee[tokenPairIDs[i]];
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

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");

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
    function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s) internal {
        bytes32 PKx = bytesToBytes32(PK, 0);
        bytes32 PKy = bytesToBytes32(PK, 32);

        bytes32 Rx = bytesToBytes32(r, 0);
        bytes32 Ry = bytesToBytes32(r, 32);

        require(storageData.sigVerifier.verify(curveID, s, PKx, PKy, Rx, Ry, message), "Signature verification failed");
    }

    function getSmgFeeProxy() internal view returns (address) {
        address smgFeeProxy = storageData.smgFeeProxy;
        return (smgFeeProxy == address(0)) ? owner : smgFeeProxy;
    }

    //*********************************************************************************************
    //*********************************************************************************************
    // NFT
    function onERC721Received(address, address, uint256, bytes memory)
        public
        pure
        returns(bytes4)
    {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory) 
        public 
        pure 
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) 
        public
        pure
        returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }

    // using "memory" instead of "calldata" to avoid Stakck too deep
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount)
        public
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
    {
        require(tokenIDs.length > 0 && tokenIDs.length <= getMaxBatchSize(), "Invalid length");
        require(tokenIDs.length == tokenValues.length, "Length mismatch");

        NFTLibV1.RapidityUserLockNFTParams memory params = NFTLibV1.RapidityUserLockNFTParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            currentChainID: currentChainID,
            tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
            etherTransferGasLimit: getEtherTransferGasLimit(),
            destUserAccount: userAccount,
            smgFeeProxy: getSmgFeeProxy()
        });
        NFTLibV1.userLockNFT(storageData, params);
    }

    // using "memory" instead of "calldata" to avoid Stakck too deep
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount)
        public
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
    {
        require(tokenIDs.length > 0 && tokenIDs.length <= getMaxBatchSize(), "Invalid length");
        require(tokenIDs.length == tokenValues.length, "Length mismatch");

        NFTLibV1.RapidityUserBurnNFTParams memory params = NFTLibV1.RapidityUserBurnNFTParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            currentChainID: currentChainID,
            tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
            etherTransferGasLimit: getEtherTransferGasLimit(),
            srcTokenAccount: tokenAccount,
            destUserAccount: userAccount,
            smgFeeProxy: getSmgFeeProxy()
        });
        NFTLibV1.userBurnNFT(storageData, params);
    }

    // using "memory" instead of "calldata" to avoid Stakck too deep
    function smgMintNFT(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory extData, address tokenAccount, address userAccount, bytes memory r, bytes32 s)
        public
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        NFTLibV1.RapiditySmgMintNFTParams memory params = NFTLibV1.RapiditySmgMintNFTParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            extData: extData,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });

        NFTLibV1.smgMintNFT(storageData, params);
        // bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, tokenIDs, tokenValues, extData, tokenAccount, userAccount));
        bytes32 mHash = sha256(abi.encode(currentChainID, params.uniqueID, params.tokenPairID, params.tokenIDs, params.tokenValues, params.extData, params.destTokenAccount, params.destUserAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    // using "memory" instead of "calldata" to avoid Stakck too deep
    function smgReleaseNFT(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, address userAccount, bytes memory r, bytes32 s)
        public
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        NFTLibV1.RapiditySmgReleaseNFTParams memory params = NFTLibV1.RapiditySmgReleaseNFTParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });
        NFTLibV1.smgReleaseNFT(storageData, params);

        // bytes32 mHash = sha256(abi.encode(currentChainID, uniqueID, tokenPairID, tokenIDs, tokenValues, tokenAccount, userAccount));
        bytes32 mHash = sha256(abi.encode(currentChainID, params.uniqueID, params.tokenPairID, params.tokenIDs, params.tokenValues, params.destTokenAccount, params.destUserAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    function setMaxBatchSize(uint _maxBatchSize) 
      external
      onlyAdmin
    {
      maxBatchSize = _maxBatchSize;
    }

    function getMaxBatchSize() 
      public
      view
      returns (uint)
    {
      if(maxBatchSize == 0) {
        return 20;
      }
      return maxBatchSize;
    }

    function getBatchFee(uint tokenPairID, uint batchLength) 
      external
      view
      returns (uint)
    {
      uint contractFee;
      (, contractFee) = NFTLibV1.getTokenScAddrAndContractFee(storageData, tokenPairID, mapTokenPairContractFee[tokenPairID], currentChainID, batchLength);
      return contractFee;
    }

    function setEtherTransferGasLimit(uint _etherTransferGasLimit) 
      external
      onlyAdmin
    {
      etherTransferGasLimit = _etherTransferGasLimit;
    }

    function getEtherTransferGasLimit() 
      public
      view
      returns (uint)
    {
      if(etherTransferGasLimit == 0) {
        return 2300;
      }
      return etherTransferGasLimit;
    }

}
