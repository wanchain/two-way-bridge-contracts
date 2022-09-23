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

pragma solidity 0.4.26;
pragma experimental ABIEncoderV2;

import "../interfaces/IWrappedNFT721.sol";
import "../interfaces/IWrappedNFT1155.sol";
import "../interfaces/IMappingToken.sol";
import "./MappingToken.sol";
import "./TokenManagerDelegate.sol";
import "../components/Proxy.sol";

contract TokenManagerDelegateV2 is TokenManagerDelegate, Proxy {

    /************************************************************
     **
     ** STATE VARIABLES
     **
     ************************************************************/
    address public operator;

    /// tokenPairID => type; type: 0 is ERC20, 1 is ERC721, ...
    enum TokenCrossType {ERC20, ERC721, ERC1155}
    mapping(uint => uint8) public mapTokenPairType;


    /************************************************************
     **
     ** EVENTS
     **
     ************************************************************/
     event SetOperator(address indexed oldOperator, address indexed newOperator);
     event SetTokenPairType(uint indexed tokenPairId, uint indexed tokenPairType);

    /**
     *
     * MODIFIERS
     *
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
    function setTokenPairTypes(uint[] tokenPairIds, uint8[] tokenPairTypes)
        external
        onlyOperator
    {
       require(tokenPairIds.length == tokenPairTypes.length, "length mismatch");
       for(uint idx = 0; idx < tokenPairIds.length; ++idx) {
          mapTokenPairType[tokenPairIds[idx]] = tokenPairTypes[idx];
          emit SetTokenPairType(tokenPairIds[idx], tokenPairTypes[idx]);
       }
    }

    function setOperator(address account)
        external
        onlyOwner
    {
       emit SetOperator(operator, account);
       operator = account;
    }

    function getNftInfo(uint tokenPairId) external view returns (address addr, string name, string symbol) {
        if (mapTokenPairInfo[tokenPairId].fromChainID == 0) {
            name = '';
            symbol = '';
            addr = address(0);
        } else {
            address instance = bytesToAddress(mapTokenPairInfo[tokenPairId].toAccount);
            name = IMappingToken(instance).name();
            symbol = IMappingToken(instance).symbol();
            addr = instance;
        }
    }

    //*****************************************************************************
    //*****************************************************************************
    // ERC1155
    //*****************************************************************************
    //*****************************************************************************
    function mintNFT(
        uint    tokenCrossType,
        address tokenAddress,
        address to,
        uint[]  tokenIDs,
        uint[]  values,
        bytes   data
    )
        public
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

    function burnNFT(
        uint    tokenCrossType,
        address tokenAddress,
        address from,
        uint[]  tokenIDs,
        uint[]  values
    )
        public
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
