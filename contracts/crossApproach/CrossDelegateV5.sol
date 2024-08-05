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

pragma solidity 0.8.18;

import "./CrossDelegateV4.sol";

contract CrossDelegateV5 is CrossDelegateV4 {

    struct NftBaseInfo {
        address collection;
        uint256 tokenId;
    }

    // NFT collection addresss => register count
    mapping(address => uint256) public nftRegisterCount;

    // NFT collection address => NFT id => cross chain id
    mapping(address => mapping(uint256 => uint256)) public crossId;

    mapping(uint256 => NftBaseInfo) public crossIdToNftBaseInfo;

    event RegisterNftCrossId(address indexed collection, uint256 indexed tokenId, uint256 indexed crossId);

    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount)
        public
        payable
        override
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
    {
        super.userLockNFT(smgID, tokenPairID, tokenIDs, tokenValues, userAccount);

        address tokenScAddr = getLocalScByTokenPairID(tokenPairID);
        uint count = tokenIDs.length;
        for (uint i = 0; i < count; i++) {
            registerNftCrossId(tokenScAddr, tokenIDs[i]);
        }
    }

    function registerNftCrossId(address collection, uint tokenId) internal returns (uint256) {
        if (crossId[collection][tokenId] > 0) {
            return crossId[collection][tokenId];
        } else {
            nftRegisterCount[collection] += 1;
            crossId[collection][tokenId] = nftRegisterCount[collection];
            crossIdToNftBaseInfo[nftRegisterCount[collection]] = NftBaseInfo(collection, tokenId);
            emit RegisterNftCrossId(collection, tokenId, nftRegisterCount[collection]);
            return nftRegisterCount[collection];
        }
    }

    function batchRegisterNftCrossId(address[] memory collection, uint256[] memory tokenIds) external onlyAdmin {
        require(collection.length == tokenIds.length, "CrossDelegateV5: collection length not equal to tokenIds length");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            registerNftCrossId(collection[i], tokenIds[i]);
        }
    }

    function getLocalScByTokenPairID(uint tokenPairID)
        public
        view
        returns (address)
    {
        ITokenManager tokenManager = storageData.tokenManager;
        uint fromChainID;
        uint toChainID;
        bytes memory fromTokenAccount;
        bytes memory toTokenAccount;
        (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = tokenManager.getTokenPairInfo(tokenPairID);
        require(fromChainID != 0, "Token does not exist");

        address tokenScAddr;
        if (currentChainID == fromChainID) {
            tokenScAddr = CrossTypes.bytesToAddress(fromTokenAccount);
        } else if (currentChainID == toChainID) {
            tokenScAddr = CrossTypes.bytesToAddress(toTokenAccount);
        } else {
            require(false, "Invalid token pair");
        }
        return tokenScAddr;
    }
}