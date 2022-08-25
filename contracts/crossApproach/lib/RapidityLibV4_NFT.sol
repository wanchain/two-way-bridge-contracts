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

import "../../interfaces/IERC1155.sol";
import 'openzeppelin-eth/contracts/token/ERC721/IERC721.sol';
import "./RapidityTxLib.sol";
import "./CrossTypesV1.sol";
import "../../interfaces/ITokenManager.sol";

library RapidityLibV4_NFT {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;

    enum TokenCrossType {ERC20, ERC721, ERC1155}

    //**************************************************************
    //**************************************************************
    struct NFTUserLockParams {
        bytes32                 smgID;
        uint                    tokenPairID;
        uint[]                  tokenIDs;
        uint[]                  values;
        bytes                   data;
        bytes                   userAccount;
    }
    struct RapidityUserLockNFTParams {
        NFTUserLockParams       nftParams;              /// NFT basic Params
        uint                    currentChainID;         /// current chain ID
        uint                    tokenPairContractFee;   /// fee of token pair
        address                 smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    //**************************************************************
    //**************************************************************
    struct NFTUserBurnParams {
        bytes32                 smgID;
        uint                    tokenPairID;
        uint[]                  tokenIDs;
        uint[]                  values;
        uint                    fee;
        address                 tokenAccount;
        bytes                   userAccount;
    }
    struct RapidityUserBurnNFTParams {
        NFTUserBurnParams       nftParams;              /// NFT basic Params
        uint                    currentChainID;         /// current chain ID
        uint                    tokenPairContractFee;   /// fee of token pair
        address                 smgFeeProxy;            /// address of the proxy to store fee for storeman group
    }

    //**************************************************************
    //**************************************************************
    struct NFTSmgMintParams {
        bytes32                 uniqueID;
        bytes32                 smgID;
        uint                    tokenPairID;
        uint[]                  tokenIDs;
        uint[]                  values;
        bytes                   data;
        uint                    fee;
        address                 tokenAccount;
        address                 userAccount;
    }

    //**************************************************************
    //**************************************************************
    struct NFTSmgReleaseParams {
        bytes32                 uniqueID;
        bytes32                 smgID;
        uint                    tokenPairID;
        uint[]                  tokenIDs;
        uint[]                  values;
        bytes                   data;
        uint                    fee;
        address                 tokenAccount;
        address                 userAccount;
    }

    event UserLockNFT(bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    event UserBurnNFT(bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    event SmgMintNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    event SmgReleaseNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);

    function getTokenAddrAndContractFee(CrossTypesV1.Data storage storageData, uint tokenPairID, uint tokenPairContractFee, uint currentChainID) 
        private 
        returns (address, uint)
    {
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = storageData.tokenManager.getTokenPairInfo(tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        uint contractFee = tokenPairContractFee;
        address tokenScAddr;
        if (currentChainID == fromChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[fromChainID][toChainID];
            }
            tokenScAddr = CrossTypesV1.bytesToAddress(fromTokenAccount);
        } else if (currentChainID == toChainID) {
            if (contractFee == 0) {
                contractFee = storageData.mapContractFee[toChainID][fromChainID];
            }
            tokenScAddr = CrossTypesV1.bytesToAddress(toTokenAccount);
        } else {
            require(false, "Invalid token pair");
        }
        return (tokenScAddr, contractFee);
    }

    /// @notice                         mintBridge, user lock token on token original chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user mint lock token on token original chain
    function userLockNFT(CrossTypesV1.Data storage storageData, RapidityUserLockNFTParams memory params)
        public
    {
        address tokenScAddr;
        uint contractFee;
        (tokenScAddr, contractFee) = getTokenAddrAndContractFee(storageData, params.nftParams.tokenPairID, params.tokenPairContractFee, params.currentChainID);
        if (contractFee > 0) {
            params.smgFeeProxy.transfer(contractFee);
        }

        uint left = (msg.value).sub(contractFee);

        uint tokenCrossType = storageData.tokenManager.mapTokenPairType(params.nftParams.tokenPairID);
        if (tokenCrossType == uint(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < params.nftParams.tokenIDs.length; ++idx) {
                IERC721(tokenScAddr).safeTransferFrom(msg.sender, address(this), params.nftParams.tokenIDs[idx], params.nftParams.data);
            }
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(tokenScAddr).safeBatchTransferFrom(msg.sender, address(this), params.nftParams.tokenIDs, params.nftParams.values, params.nftParams.data);
        }
        else{
            require(false, "Not support");
        }

        if (left != 0) {
            (msg.sender).transfer(left);
        }


        uint aryLen = 5 + params.nftParams.tokenIDs.length + params.nftParams.values.length;
        string[] memory keys = new string[](aryLen);
        bytes[] memory values = new bytes[](aryLen);
        _formatData(keys, values, tokenScAddr, 0, params.nftParams.tokenIDs, params.nftParams.values, params.nftParams.data, contractFee);
        
        keys[aryLen - 1] = "userAccount:bytes";
        values[aryLen - 1] = abi.encodePacked(params.nftParams.userAccount);

        emit UserLockNFT(params.nftParams.smgID, params.nftParams.tokenPairID, keys, values);
    }

    /// @notice                         burnBridge, user lock token on token original chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for user burn lock token on token original chain
    function userBurnNFT(CrossTypesV1.Data storage storageData, RapidityUserBurnNFTParams memory params)
        public
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint256 contractFee;
        address tokenScAddr;
        (tokenScAddr, contractFee) = getTokenAddrAndContractFee(storageData, params.nftParams.tokenPairID, params.tokenPairContractFee, params.currentChainID);
        require(params.nftParams.tokenAccount == tokenScAddr, "Invalid token account");

        uint tokenCrossType = tokenManager.mapTokenPairType(params.nftParams.tokenPairID);
        require((tokenCrossType == uint(TokenCrossType.ERC721) || tokenCrossType == uint8(TokenCrossType.ERC1155)), "Not support");
        ITokenManager(tokenManager).burnNFT(tokenCrossType, tokenScAddr, msg.sender, params.nftParams.tokenIDs, params.nftParams.values);

        if (contractFee > 0) {
            params.smgFeeProxy.transfer(contractFee);
        }

        uint left = (msg.value).sub(contractFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        uint aryLen = 5 + params.nftParams.tokenIDs.length + params.nftParams.values.length;
        string[] memory keys = new string[](aryLen);
        bytes[] memory values = new bytes[](aryLen);
        _formatData(keys, values, params.nftParams.tokenAccount, params.nftParams.fee, params.nftParams.tokenIDs, params.nftParams.values, '0x0', contractFee);

        keys[aryLen - 1] = "userAccount:bytes";
        values[aryLen - 1] = abi.encodePacked(params.nftParams.userAccount);

        emit UserBurnNFT(params.nftParams.smgID, params.nftParams.tokenPairID, keys, values);
    }

    /// @notice                         mintBridge, storeman mint lock token on token shadow chain
    /// @notice                         event invoked by user mint lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman mint lock token on token shadow chain
    function smgMintNFT(CrossTypesV1.Data storage storageData, NFTSmgMintParams memory params, address smgFeeProxy)
        public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);
        ITokenManager tokenManager = storageData.tokenManager;

        uint tokenCrossType = tokenManager.mapTokenPairType(params.tokenPairID);
        require((tokenCrossType == uint(TokenCrossType.ERC721) || tokenCrossType == uint8(TokenCrossType.ERC1155)), "Not support");

        ITokenManager(tokenManager).mintNFT(tokenCrossType, params.tokenAccount, params.userAccount, params.tokenIDs, params.values, params.data);

        uint aryLen = 5 + params.tokenIDs.length + params.values.length;
        string[] memory keys = new string[](aryLen);
        bytes[] memory values = new bytes[](aryLen);
        _formatData(keys,values, params.tokenAccount, params.fee, params.tokenIDs, params.values, params.data, 0);

        keys[aryLen - 1] = "userAccount:address";
        values[aryLen - 1] = abi.encodePacked(params.userAccount);

        emit SmgMintNFT(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
    }

    /// @notice                         burnBridge, storeman burn lock token on token shadow chain
    /// @notice                         event invoked by user burn lock
    /// @param storageData              Cross storage data
    /// @param params                   parameters for storeman burn lock token on token shadow chain
    function smgReleaseNFT(CrossTypesV1.Data storage storageData, NFTSmgReleaseParams memory params, address smgFeeProxy)
        public
    {
        uint idx;
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        uint8 tokenCrossType = storageData.tokenManager.mapTokenPairType(params.tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(idx = 0; idx < params.tokenIDs.length; ++idx) {
                IERC721(params.tokenAccount).safeTransferFrom(address(this), params.userAccount, params.tokenIDs[idx], params.data);
            }
        }
        else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(params.tokenAccount).safeBatchTransferFrom(address(this), params.userAccount, params.tokenIDs, params.values, params.data);
        }
        else {
            require(false, "Not support");
        }

        uint aryLen = 5 + params.tokenIDs.length + params.values.length;
        string[] memory keys = new string[](aryLen);
        bytes[] memory values = new bytes[](aryLen);
        _formatData(keys,values, params.tokenAccount, params.fee, params.tokenIDs, params.values, params.data, 0);

        keys[aryLen - 1] = "userAccount:address";
        values[aryLen - 1] = abi.encodePacked(params.userAccount);

        emit SmgReleaseNFT(params.uniqueID, params.smgID, params.tokenPairID, keys, values);
    }

    function _formatData(string[] memory keys, bytes[] memory values, address tokenAccount, uint fee, uint[] tokenIDs, uint[] tokenValues, bytes memory data, uint contractFee)
         internal
    {
        keys[0] = "tokenAccount:address";
        values[0] = abi.encodePacked(tokenAccount);

        keys[1] = "fee:uint256";
        values[1] = abi.encodePacked(fee);

        keys[2] = "data:bytes";
        values[2] = abi.encodePacked(data);

        keys[3] = "contractFee:uint256";
        values[3] = abi.encodePacked(contractFee);

        uint idx;
        uint curPos = 4;
        for(idx = 0; idx < tokenIDs.length; ++idx){
            keys[curPos + idx] = "tokenID:uint256";
            values[curPos + idx] = abi.encodePacked(tokenIDs[idx]);
        }

        curPos = 4 + tokenIDs.length;
        for(idx = 0; idx < tokenValues.length; ++idx){
            keys[curPos + idx] = "value:uint256";
            values[curPos + idx] = abi.encodePacked(tokenValues[idx]);
        }
    }
}
