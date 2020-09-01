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
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;

/**
 * Math operations with safety checks
 */

import "../components/Admin.sol";
import "./TokenManagerStorage.sol";
import "./MappingToken.sol";
import "./IMappingToken.sol";

contract TokenManagerDelegate is TokenManagerStorage, Admin {
    using SafeMath for uint;
    /************************************************************
     **
     ** EVENTS
     **
     ************************************************************/

     event AddToken(address tokenAddress, string name, string symbol, uint8 decimals);
     event AddTokenPair(uint indexed id, uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount);
    //  event UpdateTokenPair(uint indexed id, AncestorInfo aInfo, uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount);
     event RemoveTokenPair(uint indexed id);
     event UpdateToken(address tokenAddress, string name, string symbol);

    /**
     *
     * MODIFIERS
     *
     */

    modifier onlyNotExistID(uint id) {
        require(mapTokenPairInfo[id].fromChainID == 0, "token exist");
        _;
    }

    modifier onlyExistID(uint id) {
        require(mapTokenPairInfo[id].fromChainID > 0, "token not exist");
        _;
    }

    /**
    *
    * MANIPULATIONS
    *
    */
    
    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    function mintToken(
        uint    id,
        address to,
        uint    value
    )
        external
        onlyAdmin
        onlyExistID(id)
    {
        address instance = bytesToAddress(mapTokenPairInfo[id].toAccount);
        IMappingToken(instance).mint(to, value);
    }

    function burnToken(
        uint    id,
        uint    value
    )
        external
        onlyAdmin
        onlyExistID(id)
    {
        address instance = bytesToAddress(mapTokenPairInfo[id].toAccount);
        IMappingToken(instance).burn(msg.sender, value);
    }

    function addToken(
        string calldata name,
        string calldata symbol,
        uint8 decimals
    )
        external
        onlyOwner
    {
        address tokenAddress = (address)(new MappingToken(name, symbol, decimals));
        
        emit AddToken(tokenAddress, name, symbol, decimals);
    }

    function addTokenPair(
        uint    id,

        AncestorInfo calldata aInfo,

        uint    fromChainID,
        bytes calldata  fromAccount,
        uint    toChainID,
        bytes calldata  toAccount
    )
        external
        onlyOwner
        onlyNotExistID(id)
    {
        // create a new record
        mapTokenPairInfo[id].fromChainID = fromChainID;
        mapTokenPairInfo[id].fromAccount = fromAccount;
        mapTokenPairInfo[id].toChainID = toChainID;
        mapTokenPairInfo[id].toAccount = toAccount;

        mapTokenPairInfo[id].aInfo.account = aInfo.account;
        mapTokenPairInfo[id].aInfo.name = aInfo.name;
        mapTokenPairInfo[id].aInfo.symbol = aInfo.symbol;
        mapTokenPairInfo[id].aInfo.decimals = aInfo.decimals;
        mapTokenPairInfo[id].aInfo.chainID = aInfo.chainID;

        mapTokenPairIndex[totalTokenPairs] = id;
        totalTokenPairs = totalTokenPairs.add(1);

        // fire event
        emit AddTokenPair(id, fromChainID, fromAccount, toChainID, toAccount);
    }

    function updateTokenPair(
        uint    id,

        AncestorInfo calldata aInfo,

        uint    fromChainID,
        bytes calldata  fromAccount,
        uint    toChainID,
        bytes  calldata toAccount
    )
        external
        onlyOwner
        onlyExistID(id)
    {
        mapTokenPairInfo[id].aInfo.account = aInfo.account;
        mapTokenPairInfo[id].aInfo.name = aInfo.name;
        mapTokenPairInfo[id].aInfo.symbol = aInfo.symbol;
        mapTokenPairInfo[id].aInfo.decimals = aInfo.decimals;
        mapTokenPairInfo[id].aInfo.chainID = aInfo.chainID;

        mapTokenPairInfo[id].fromChainID = fromChainID;
        mapTokenPairInfo[id].fromAccount = fromAccount;
        mapTokenPairInfo[id].toChainID = toChainID;
        mapTokenPairInfo[id].toAccount = toAccount;

        // emit UpdateTokenPair(id, aInfo, fromChainID, fromAccount, toChainID, toAccount);
    }

    function removeTokenPair(
        uint id
    )
        external
        onlyOwner
        onlyExistID(id)
    {
        for(uint i=0; i<totalTokenPairs; i++) {
            if (id == mapTokenPairIndex[i]) {
                if (i != totalTokenPairs - 1) {
                    mapTokenPairIndex[i] = mapTokenPairIndex[totalTokenPairs - 1];
                }
 
                delete mapTokenPairIndex[totalTokenPairs - 1];
                totalTokenPairs--;
                delete mapTokenPairInfo[id];
                emit RemoveTokenPair(id);
                return;
            }
        }
    }

    function updateToken(address tokenAddress, string calldata name, string calldata symbol)
        external
        onlyOwner
    {
        IMappingToken(tokenAddress).update(name, symbol);

        emit UpdateToken(tokenAddress, name, symbol);
    }

    function changeTokenOwner(address tokenAddress, address _newOwner) external onlyOwner {
        IMappingToken(tokenAddress).changeOwner(_newOwner);
    }

    function acceptTokenOwnership(address tokenAddress) external {
        IMappingToken(tokenAddress).acceptOwnership();
    }

    function getTokenPairInfo(
        uint id
    )
        external
        view
        returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount)
    {
        fromChainID = mapTokenPairInfo[id].fromChainID;
        fromAccount = mapTokenPairInfo[id].fromAccount;
        toChainID = mapTokenPairInfo[id].toChainID;
        toAccount = mapTokenPairInfo[id].toAccount;
    }

    function getTokenInfo(uint id) external view returns (address addr, string memory name, string memory symbol, uint8 decimals) {
        address instance = bytesToAddress(mapTokenPairInfo[id].toAccount);
        name = IMappingToken(instance).name();
        symbol = IMappingToken(instance).symbol();
        decimals = IMappingToken(instance).decimals();
        addr = instance;
    }

    function getAncestorInfo(uint id) external view returns (bytes memory account, string memory name, string memory symbol, uint8 decimals, uint chainId) {
        account = mapTokenPairInfo[id].aInfo.account;
        name = mapTokenPairInfo[id].aInfo.name;
        symbol = mapTokenPairInfo[id].aInfo.symbol;
        decimals = mapTokenPairInfo[id].aInfo.decimals;
        chainId = mapTokenPairInfo[id].aInfo.chainID;
    }

    function getTokenPairs()
        external
        view
        returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals)
    {
        uint cnt = totalTokenPairs;
        uint theId = 0;
        uint i = 0;

        id = new uint[](cnt);
        fromChainID = new uint[](cnt);
        fromAccount = new bytes[](cnt);
        toChainID = new uint[](cnt);
        toAccount = new bytes[](cnt);

        ancestorSymbol = new string[](cnt);
        ancestorDecimals = new uint8[](cnt);
        i = 0;
        theId = 0;
        uint j = 0;
        for (; j < totalTokenPairs; j++) {
            theId = mapTokenPairIndex[j];
            id[i] = theId;
            fromChainID[i] = mapTokenPairInfo[theId].fromChainID;
            fromAccount[i] = mapTokenPairInfo[theId].fromAccount;
            toChainID[i] = mapTokenPairInfo[theId].toChainID;
            toAccount[i] = mapTokenPairInfo[theId].toAccount;

            ancestorSymbol[i] = mapTokenPairInfo[theId].aInfo.symbol;
            ancestorDecimals[i] = mapTokenPairInfo[theId].aInfo.decimals;
            i ++;
        }
    }

    function getTokenPairsByChainID(uint chainID1, uint chainID2)
        external
        view
        returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals)
    {
        uint cnt = 0;
        uint i = 0;
        uint theId = 0;
        uint[] memory id_valid = new uint[](totalTokenPairs);
        for (; i < totalTokenPairs; i++ ) {
            theId = mapTokenPairIndex[i];
            if ((mapTokenPairInfo[theId].fromChainID == chainID1) && (mapTokenPairInfo[theId].toChainID == chainID2) ||
            (mapTokenPairInfo[theId].toChainID == chainID1) && (mapTokenPairInfo[theId].fromChainID == chainID2)) {
                id_valid[cnt] = theId;
                cnt ++;
            }
        }

        id = new uint[](cnt);
        fromChainID = new uint[](cnt);
        fromAccount = new bytes[](cnt);
        toChainID = new uint[](cnt);
        toAccount = new bytes[](cnt);

        ancestorSymbol = new string[](cnt);
        ancestorDecimals = new uint8[](cnt);

        for (i = 0; i < cnt; i++) {
            theId = id_valid[i];

            id[i] = theId;
            fromChainID[i] = mapTokenPairInfo[theId].fromChainID;
            fromAccount[i] = mapTokenPairInfo[theId].fromAccount;
            toChainID[i] = mapTokenPairInfo[theId].toChainID;
            toAccount[i] = mapTokenPairInfo[theId].toAccount;

            ancestorSymbol[i] = mapTokenPairInfo[theId].aInfo.symbol;
            ancestorDecimals[i] = mapTokenPairInfo[theId].aInfo.decimals;
        }
    }
}
