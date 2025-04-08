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

import "../interfaces/IWrappedNFT721.sol";
import "../interfaces/IWrappedNFT1155.sol";
import "./TokenManagerDelegate.sol";
import "../components/Proxy.sol";

/**
 * @title TokenManagerDelegateV2
 * @dev Enhanced version of TokenManagerDelegate with NFT support
 * This contract provides:
 * - NFT token pair type management
 * - NFT minting and burning functionality
 * - Operator role management
 * - Support for ERC721 and ERC1155 tokens
 */
contract TokenManagerDelegateV2 is TokenManagerDelegate, Proxy {

    /************************************************************
     **
     ** STATE VARIABLES
     **
     ************************************************************/
    /// @notice Address of the operator who can set token pair types
    address public operator;

    /// @notice Enumeration of supported token types for cross-chain operations
    /// @dev Defines the types of tokens that can be transferred across chains
    /// - ERC20: Standard fungible tokens
    /// - ERC721: Non-fungible tokens
    /// - ERC1155: Multi-token standard
    enum TokenCrossType {ERC20, ERC721, ERC1155}
    
    /// @notice Mapping from token pair ID to token type
    mapping(uint => uint8) public mapTokenPairType;


    /************************************************************
     **
     ** EVENTS
     **
     ************************************************************/
     /// @notice Emitted when the operator address is changed
     /// @param oldOperator Previous operator address
     /// @param newOperator New operator address
     event SetOperator(address indexed oldOperator, address indexed newOperator);
     
     /// @notice Emitted when a token pair type is set
     /// @param tokenPairId ID of the token pair
     /// @param tokenPairType Type of the token pair
     event SetTokenPairType(uint indexed tokenPairId, uint indexed tokenPairType);

    /**
     * @notice Modifier to restrict function access to operator only
     * @dev Throws if called by any account other than the operator
     */
    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    /************************************************************
     **
     ** MANIPULATIONS
     **
     ************************************************************/
    /**
     * @notice Sets token pair types for multiple token pairs
     * @dev Can only be called by the operator
     * @param tokenPairIds Array of token pair IDs
     * @param tokenPairTypes Array of token pair types
     * Requirements:
     * - Arrays must have the same length
     * - Caller must be the operator
     * Emits:
     * - SetTokenPairType event for each token pair
     */
    function setTokenPairTypes(uint[] calldata tokenPairIds, uint8[] calldata tokenPairTypes)
        external
        onlyOperator
    {
       require(tokenPairIds.length == tokenPairTypes.length, "length mismatch");
       for(uint idx = 0; idx < tokenPairIds.length; ++idx) {
          mapTokenPairType[tokenPairIds[idx]] = tokenPairTypes[idx];
          emit SetTokenPairType(tokenPairIds[idx], tokenPairTypes[idx]);
       }
    }

    /**
     * @notice Sets the operator address
     * @dev Can only be called by the contract owner
     * @param account New operator address
     * Emits:
     * - SetOperator event with old and new operator addresses
     */
    function setOperator(address account)
        external
        onlyOwner
    {
       emit SetOperator(operator, account);
       operator = account;
    }

    //*****************************************************************************
    //*****************************************************************************
    // ERC1155
    //*****************************************************************************
    //*****************************************************************************
    /**
     * @notice Mints NFTs of specified type
     * @dev Can only be called by admin
     * @param tokenCrossType Type of NFT (ERC721 or ERC1155)
     * @param tokenAddress Address of the NFT contract
     * @param to Address to receive the NFTs
     * @param tokenIDs ID of the NFT to mint
     * @param values Amount of NFTs to mint (for ERC1155)
     * @param data Additional data for the NFT
     * Requirements:
     * - Caller must be admin
     * - Token type must be valid
     */
    function mintNFT(
        uint    tokenCrossType,
        address tokenAddress,
        address to,
        uint[] calldata tokenIDs,
        uint[] calldata values,
        bytes  calldata data
    )
        external
        onlyAdmin
    {
        if(tokenCrossType == uint(TokenCrossType.ERC721)) {
            IWrappedNFT721(tokenAddress).mintBatch(to, tokenIDs, data);
        }
        else if(tokenCrossType == uint(TokenCrossType.ERC1155)) {
            IWrappedNFT1155(tokenAddress).mintBatch(to, tokenIDs, values, data);
        }
        else {
            require(false, "Invalid NFT type");
        }
    }

    /**
     * @notice Burns NFTs of specified type
     * @dev Can only be called by admin
     * @param tokenCrossType Type of NFT (ERC721 or ERC1155)
     * @param tokenAddress Address of the NFT contract
     * @param from Address to burn NFTs from
     * @param tokenIDs ID of the NFT to burn
     * @param values Amount of NFTs to burn (for ERC1155)
     * Requirements:
     * - Caller must be admin
     * - Token type must be valid
     */
    function burnNFT(
        uint    tokenCrossType,
        address tokenAddress,
        address from,
        uint[] calldata tokenIDs,
        uint[] calldata values
    )
        external
        onlyAdmin
    {
        if(tokenCrossType == uint(TokenCrossType.ERC721)) {
            IWrappedNFT721(tokenAddress).burnBatch(from, tokenIDs);
        }
        else if(tokenCrossType == uint(TokenCrossType.ERC1155)) {
            IWrappedNFT1155(tokenAddress).burnBatch(from, tokenIDs, values);
        }
        else {
            require(false, "Invalid NFT type");
        }
    }
}
