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
     event UpdateTokenPair(uint indexed id, AncestorInfo aInfo, uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount);
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
    
    function bytesToAddress(bytes b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    function mintToken(
        address tokenAddress,
        address to,
        uint    value
    )
        external
        onlyAdmin
    {
        IMappingToken(tokenAddress).mint(to, value);
    }

    function burnToken(
        address tokenAddress,
        address from,
        uint    value
    )
        external
        onlyAdmin
    {
        IMappingToken(tokenAddress).burn(from, value);
    }

    function addToken(
        string name,
        string symbol,
        uint8 decimals
    )
        external
        onlyOwner
    {
        address tokenAddress = new MappingToken(name, symbol, decimals);
        
        emit AddToken(tokenAddress, name, symbol, decimals);
    }

    function addTokenPair(
        uint    id,

        AncestorInfo aInfo,

        uint    fromChainID,
        bytes   fromAccount,
        uint    toChainID,
        bytes   toAccount
    )
        public
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

        AncestorInfo aInfo,

        uint    fromChainID,
        bytes   fromAccount,
        uint    toChainID,
        bytes   toAccount
    )
        public
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

        emit UpdateTokenPair(id, aInfo, fromChainID, fromAccount, toChainID, toAccount);
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

    function updateToken(address tokenAddress, string name, string symbol)
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

    function transferTokenOwner(address tokenAddress, address _newOwner) external onlyOwner {
        IMappingToken(tokenAddress).transferOwner(_newOwner);
    }

    function getTokenPairInfo(
        uint id
    )
        external
        view
        returns (uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount)
    {
        fromChainID = mapTokenPairInfo[id].fromChainID;
        fromAccount = mapTokenPairInfo[id].fromAccount;
        toChainID = mapTokenPairInfo[id].toChainID;
        toAccount = mapTokenPairInfo[id].toAccount;
    }

    function getTokenPairInfoSlim(
        uint id
    )
        external
        view
        returns (uint fromChainID, bytes fromAccount, uint toChainID)
    {
        fromChainID = mapTokenPairInfo[id].fromChainID;
        fromAccount = mapTokenPairInfo[id].fromAccount;
        toChainID = mapTokenPairInfo[id].toChainID;
    }

    function getTokenInfo(uint id) external view returns (address addr, string name, string symbol, uint8 decimals) {
        if (mapTokenPairInfo[id].fromChainID == 0) {
            name = '';
            symbol = '';
            decimals = 0;
            addr = address(0);
        } else {
            address instance = bytesToAddress(mapTokenPairInfo[id].toAccount);
            name = IMappingToken(instance).name();
            symbol = IMappingToken(instance).symbol();
            decimals = IMappingToken(instance).decimals();
            addr = instance;
        }
    }

    function getAncestorInfo(uint id) external view returns (bytes account, string name, string symbol, uint8 decimals, uint chainId) {
        account = mapTokenPairInfo[id].aInfo.account;
        name = mapTokenPairInfo[id].aInfo.name;
        symbol = mapTokenPairInfo[id].aInfo.symbol;
        decimals = mapTokenPairInfo[id].aInfo.decimals;
        chainId = mapTokenPairInfo[id].aInfo.chainID;
    }

    function getAncestorSymbol(uint id) external view returns (string symbol, uint8 decimals) {
        symbol = mapTokenPairInfo[id].aInfo.symbol;
        decimals = mapTokenPairInfo[id].aInfo.decimals;
    }

    function getAncestorChainID(uint id) external view returns (uint chainID) {
        chainID = mapTokenPairInfo[id].aInfo.chainID;
    }

    // function getTokenPairsFullFields()
    //     external
    //     view
    //     returns (TokenPairInfoFull[] tokenPairs)
    // {
    //     tokenPairs = new TokenPairInfoFull[](totalTokenPairs);
    //     for (uint i = 0; i < totalTokenPairs; i++) {
    //         uint theId = mapTokenPairIndex[i];
    //         tokenPairs[i].aInfo = mapTokenPairInfo[theId].aInfo;
    //         tokenPairs[i].fromChainID = mapTokenPairInfo[theId].fromChainID;
    //         tokenPairs[i].fromAccount = mapTokenPairInfo[theId].fromAccount;
    //         tokenPairs[i].toChainID = mapTokenPairInfo[theId].toChainID;
    //         tokenPairs[i].toAccount = mapTokenPairInfo[theId].toAccount;
    //         tokenPairs[i].id = theId;
    //     }
    //     return tokenPairs;
    // }

    // function getTokenPairsByChainID2(uint chainID1, uint chainID2)
    //     external
    //     view
    //     returns (TokenPairInfoFull[] tokenPairs)
    // {
    //     uint cnt = 0;
    //     uint i = 0;
    //     uint theId = 0;
    //     uint[] memory id_valid = new uint[](totalTokenPairs);
    //     for (; i < totalTokenPairs; i++ ) {
    //         theId = mapTokenPairIndex[i];
    //         if ((mapTokenPairInfo[theId].fromChainID == chainID1) && (mapTokenPairInfo[theId].toChainID == chainID2) ||
    //         (mapTokenPairInfo[theId].toChainID == chainID1) && (mapTokenPairInfo[theId].fromChainID == chainID2)) {
    //             id_valid[cnt] = theId;
    //             cnt ++;
    //         }
    //     }

    //     tokenPairs = new TokenPairInfoFull[](cnt);
    //     for (i = 0; i < cnt; i++) {
    //         theId = id_valid[i];
    //         tokenPairs[i].aInfo = mapTokenPairInfo[theId].aInfo;
    //         tokenPairs[i].fromChainID = mapTokenPairInfo[theId].fromChainID;
    //         tokenPairs[i].fromAccount = mapTokenPairInfo[theId].fromAccount;
    //         tokenPairs[i].toChainID = mapTokenPairInfo[theId].toChainID;
    //         tokenPairs[i].toAccount = mapTokenPairInfo[theId].toAccount;
    //         tokenPairs[i].id = theId;
    //     }
    // }

    function getTokenPairs()
        external
        view
        returns (uint[] id, uint[] fromChainID, bytes[] fromAccount, uint[] toChainID, bytes[] toAccount,
          string[] ancestorSymbol, uint8[] ancestorDecimals, bytes[] ancestorAccount, string[] ancestorName, uint[] ancestorChainID)
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

        ancestorAccount = new bytes[](cnt);
        ancestorName = new string[](cnt);
        ancestorChainID = new uint[](cnt);

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

            ancestorAccount[i] = mapTokenPairInfo[theId].aInfo.account;
            ancestorName[i] = mapTokenPairInfo[theId].aInfo.name;
            ancestorChainID[i] = mapTokenPairInfo[theId].aInfo.chainID;
            i ++;
        }
    }

    function getTokenPairsByChainID(uint chainID1, uint chainID2)
        external
        view
        returns (uint[] id, uint[] fromChainID, bytes[] fromAccount, uint[] toChainID, bytes[] toAccount,
          string[] ancestorSymbol, uint8[] ancestorDecimals, bytes[] ancestorAccount, string[] ancestorName, uint[] ancestorChainID)
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

        ancestorAccount = new bytes[](cnt);
        ancestorName = new string[](cnt);
        ancestorChainID = new uint[](cnt);

        for (i = 0; i < cnt; i++) {
            theId = id_valid[i];

            id[i] = theId;
            fromChainID[i] = mapTokenPairInfo[theId].fromChainID;
            fromAccount[i] = mapTokenPairInfo[theId].fromAccount;
            toChainID[i] = mapTokenPairInfo[theId].toChainID;
            toAccount[i] = mapTokenPairInfo[theId].toAccount;

            ancestorSymbol[i] = mapTokenPairInfo[theId].aInfo.symbol;
            ancestorDecimals[i] = mapTokenPairInfo[theId].aInfo.decimals;
            
            ancestorAccount[i] = mapTokenPairInfo[theId].aInfo.account;
            ancestorName[i] = mapTokenPairInfo[theId].aInfo.name;
            ancestorChainID[i] = mapTokenPairInfo[theId].aInfo.chainID;
        }
    }
}
