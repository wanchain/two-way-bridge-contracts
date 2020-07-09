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

pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * Math operations with safety checks
 */

import "../components/Owned.sol";
import "./TokenManagerStorage.sol";
import "./MappingToken.sol";
import "./IMappingToken.sol";

contract TokenManagerDelegate is TokenManagerStorage, Owned {
    using SafeMath for uint;
    /**
     *
     * MODIFIERS
     *
     */

    // modifier onlyValidAccount(bytes32 account) {
    //     require(account.length != 0, "Account is null");
    //     _;
    // }

    modifier onlyValidID(uint id) {
        require(mapTokenPairInfo[id].tokenAddress != address(0), "id not exists");
        require(!(mapTokenPairInfo[id].isDelete), "token deleted");
        _;
    }

    modifier onlyAdmin() {
        require(mapAdmin[msg.sender], "not admin");
        _;
    }

    /**
    *
    * PRIVATE
    *
    */

    function bytesToBytes32(bytes b, uint offset) private pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) << (i * 8);
        }
        return out;
    }

    function bytes32ToBytes(bytes32 data) private pure returns (bytes) {
        return abi.encodePacked(data);
    }

    /**
    *
    * MANIPULATIONS
    *
    */

    /// @notice If WAN coin is sent to this address, send it back.
    /// @dev If WAN coin is sent to this address, send it back.
    function() external payable {
        revert("Not support");
    }

    function addToken(
        string name,
        string symbol,
        uint8 decimals
    )
        external
        onlyOwner
    {
        // check token
        require(bytes(name).length != 0, "name is null");
        require(bytes(symbol).length != 0, "symbol is null");

        address tokenAddress = new MappingToken(string(name), string(symbol), decimals);
        // fire event
        emit TokenAdd(tokenAddress, name, symbol, decimals);
    }

    function addTokenPair(
        uint    id,

        AncestorInfo aInfo,

        uint    fromChainID,
        bytes32   fromAccount,
        uint    toChainID,
        address tokenAddress
    )
        public
        onlyOwner
        // onlyValidAccount(aInfo.ancestorAccount)
        // onlyValidAccount(fromAccount)
    {
        // check ancestor
        require(bytes(aInfo.ancestorName).length != 0, "ancestorName is null");
        require(bytes(aInfo.ancestorSymbol).length != 0, "ancestorSymbol is null");

        // create a new record
        mapTokenPairInfo[id] = TokenPairInfo(fromChainID, fromAccount, toChainID, tokenAddress, false);
        mapAncestorInfo[id] = AncestorInfo(aInfo.ancestorAccount, aInfo.ancestorName, aInfo.ancestorSymbol,
                                    aInfo.ancestorDecimals, aInfo.ancestorChainID);

        totalTokenPairs = totalTokenPairs.add(1);
        mapTokenPairIndex[totalTokenPairs] = id;

        // fire event
        emit TokenPairAdd(id, fromChainID, fromAccount, toChainID, tokenAddress);
    }

    function updateAncestorInfo(
        uint    id,

        bytes32   ancestorAccount,
        string   ancestorName,
        string   ancestorSymbol,
        uint    ancestorChainID
    )
        public
        onlyOwner
        onlyValidID(id)
        // onlyValidAccount(ancestorAccount)
    {
        require(bytes(ancestorName).length != 0, "ancestorName is null");
        require(bytes(ancestorSymbol).length != 0, "ancestorSymbol is null");

        mapAncestorInfo[id].ancestorAccount = ancestorAccount;
        mapAncestorInfo[id].ancestorName = ancestorName;
        mapAncestorInfo[id].ancestorSymbol = ancestorSymbol;
        mapAncestorInfo[id].ancestorChainID = ancestorChainID;

        emit UpdateAncestorInfo(id, ancestorAccount, ancestorName, ancestorSymbol, ancestorChainID);
    }

    function updateTokenPair(
        uint    id,

        uint    fromChainID,
        bytes32   fromAccount,

        uint     toChainID,
        address  tokenAddress
    )
        public
        onlyOwner
        onlyValidID(id)
        // onlyValidAccount(fromAccount)
    {
        mapTokenPairInfo[id].fromChainID = fromChainID;
        mapTokenPairInfo[id].fromAccount = fromAccount;
        mapTokenPairInfo[id].toChainID = toChainID;
        mapTokenPairInfo[id].tokenAddress = tokenAddress;

        emit UpdateTokenPair(id, fromChainID, fromAccount, toChainID, tokenAddress);
    }

    function removeTokenPair(
        uint id
    )
        public
        onlyOwner
        onlyValidID(id)
    {
        mapTokenPairInfo[id].isDelete = true;

        emit RemoveTokenPair(id);
    }

    function mintToken(
        uint    id,
        address to,
        uint    value
    )
        public
        onlyAdmin
        onlyValidID(id)
    {
        address instance = mapTokenPairInfo[id].tokenAddress;
        IMappingToken(instance).mint(to, value);

        emit MintToken(id, to, value);
    }

    function burnToken(
        uint    id,
        uint    value
    )
        public
        onlyAdmin
        onlyValidID(id)
    {
        address instance = mapTokenPairInfo[id].tokenAddress;
        IMappingToken(instance).burn(msg.sender, value);

        emit BurnToken(id, value);
    }

    function addAdmin(
        address admin
    )
        public
        onlyOwner
    {
        mapAdmin[admin] = true;

        emit AddAdmin(admin);
    }

    function removeAdmin(
        address admin
    )
        public
        onlyOwner
    {
        delete mapAdmin[admin];

        emit RemoveAdmin(admin);
    }

    function getTokenPairInfo(
        uint id
    )
        public
        view
        returns (uint fromChainID, bytes32 fromAccount, uint toChainID, address tokenAddress, bool isDelete)
    {
        fromChainID = mapTokenPairInfo[id].fromChainID;
        fromAccount = mapTokenPairInfo[id].fromAccount;
        toChainID = mapTokenPairInfo[id].toChainID;
        tokenAddress = mapTokenPairInfo[id].tokenAddress;
        isDelete = mapTokenPairInfo[id].isDelete;
    }

    function getTokenInfo(uint id) public view returns (address addr, string name, string symbol, uint8 decimals) {
        address instance = mapTokenPairInfo[id].tokenAddress;
        name = IMappingToken(instance).name();
        symbol = IMappingToken(instance).symbol();
        decimals = IMappingToken(instance).decimals();
        addr = instance;
    }

    function getAncestorInfo(uint id) public view returns (bytes32 account, string name, string symbol, uint8 decimals, uint chainId) {
        account = mapAncestorInfo[id].ancestorAccount;
        name = mapAncestorInfo[id].ancestorName;
        symbol = mapAncestorInfo[id].ancestorSymbol;
        decimals = mapAncestorInfo[id].ancestorDecimals;
        chainId = mapAncestorInfo[id].ancestorChainID;
    }

    // function getTokenPairs()
    //     external
    //     view
    //     returns (uint[] id, uint[] fromChainID, bytes32[] fromAccount, uint[] toChainID, address[] tokenAddress, string[] ancestorSymbol, uint8[] ancestorDecimals)
    // {
    //     uint cnt = 0;
    //     uint i = 0;
    //     for (; i < totalTokenPairs; i++ ) {
    //         if (!mapTokenPairInfo[mapTokenPairIndex[i + 1]].isDelete) {
    //             cnt ++;
    //         }
    //     }

    //     id = new uint[](cnt);
    //     fromChainID = new uint[](cnt);
    //     fromAccount = new bytes32[](cnt);
    //     toChainID = new uint[](cnt);
    //     tokenAddress = new address[](cnt);

    //     ancestorSymbol = new string[](cnt);
    //     ancestorDecimals = new uint8[](cnt);

    //     for (; i < cnt; i++) {
    //         uint theId = mapTokenPairIndex[i + 1];

    //         id[i] = theId;
    //         fromChainID[i] = mapTokenPairInfo[theId].fromChainID;
    //         fromAccount[i] = mapTokenPairInfo[theId].fromAccount;
    //         toChainID[i] = mapTokenPairInfo[theId].toChainID;
    //         tokenAddress[i] = mapTokenPairInfo[theId].tokenAddress;

    //         ancestorSymbol[i] = mapAncestorInfo[theId].ancestorSymbol;
    //         ancestorDecimals[i] = mapAncestorInfo[theId].ancestorDecimals;
    //     }
    // }

    function getTokenPairs()
        external
        view
        returns (uint[] id, uint[] fromChainID, bytes32[] fromAccount, uint[] toChainID, address[] tokenAddress, string[] ancestorSymbol, uint8[] ancestorDecimals)
    {
        uint cnt = 0;
        uint i = 0;
        for (; i < totalTokenPairs; i++ ) {
            if (mapTokenPairIndex[i + 1] > 0) {
                cnt ++;
            }
        }

        id = new uint[](cnt);
        fromChainID = new uint[](cnt);
        fromAccount = new bytes32[](cnt);
        toChainID = new uint[](cnt);
        tokenAddress = new address[](cnt);

        ancestorSymbol = new string[](cnt);
        ancestorDecimals = new uint8[](cnt);

        for (i = 0; i < cnt; i++) {
            uint theId = mapTokenPairIndex[i + 1];

            id[i] = theId;
            fromChainID[i] = mapTokenPairInfo[theId].fromChainID;
            fromAccount[i] = mapTokenPairInfo[theId].fromAccount;
            toChainID[i] = mapTokenPairInfo[theId].toChainID;
            tokenAddress[i] = mapTokenPairInfo[theId].tokenAddress;

            ancestorSymbol[i] = mapAncestorInfo[theId].ancestorSymbol;
            ancestorDecimals[i] = mapAncestorInfo[theId].ancestorDecimals;
        }
    }
}
