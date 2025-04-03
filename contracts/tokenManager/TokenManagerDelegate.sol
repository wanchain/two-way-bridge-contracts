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

/**
 * Math operations with safety checks
 */

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IWrappedToken.sol";
import "../components/Admin.sol";
import "./TokenManagerStorage.sol";
import "./WrappedToken.sol";

/**
 * @title TokenManagerDelegate
 * @dev Implementation contract for token management functionality
 * This contract provides:
 * - Token pair management (add, update, remove)
 * - Token minting and burning
 * - Token ownership management
 * - Token information retrieval
 */
contract TokenManagerDelegate is TokenManagerStorage, Admin {
    using SafeMath for uint;
    /************************************************************
     **
     ** EVENTS
     **
     ************************************************************/

     /// @notice Emitted when a new token is added
     /// @param tokenAddress Address of the new token
     /// @param name Name of the token
     /// @param symbol Symbol of the token
     /// @param decimals Number of decimal places
     event AddToken(address tokenAddress, string name, string symbol, uint8 decimals);
     
     /// @notice Emitted when a new token pair is added
     /// @param id ID of the token pair
     /// @param fromChainID Source chain ID
     /// @param fromAccount Source token address
     /// @param toChainID Destination chain ID
     /// @param toAccount Destination token address
     event AddTokenPair(uint indexed id, uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount);
     
     /// @notice Emitted when a token pair is updated
     /// @param id ID of the token pair
     /// @param aInfo Updated ancestor token information
     /// @param fromChainID Source chain ID
     /// @param fromAccount Source token address
     /// @param toChainID Destination chain ID
     /// @param toAccount Destination token address
     event UpdateTokenPair(uint indexed id, AncestorInfo aInfo, uint fromChainID, bytes fromAccount, uint toChainID, bytes toAccount);
     
     /// @notice Emitted when a token pair is removed
     /// @param id ID of the removed token pair
     event RemoveTokenPair(uint indexed id);
     
     /// @notice Emitted when a token's information is updated
     /// @param tokenAddress Address of the updated token
     /// @param name New name of the token
     /// @param symbol New symbol of the token
     event UpdateToken(address tokenAddress, string name, string symbol);

    /**
     *
     * MODIFIERS
     *
     */

    /**
     * @notice Modifier to ensure token pair ID does not exist
     * @dev Throws if token pair ID already exists
     */
    modifier onlyNotExistID(uint id) {
        require(mapTokenPairInfo[id].fromChainID == 0, "token exist");
        _;
    }

    /**
     * @notice Modifier to ensure token pair ID exists
     * @dev Throws if token pair ID does not exist
     */
    modifier onlyExistID(uint id) {
        require(mapTokenPairInfo[id].fromChainID > 0, "token not exist");
        _;
    }

    /**
    *
    * MANIPULATIONS
    *
    */
    
    /**
     * @notice Converts bytes to address
     * @dev Uses assembly for efficient conversion
     * @param b Bytes to convert
     * @return addr The converted address
     */
    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    /**
     * @notice Mints new tokens
     * @dev Can only be called by admin
     * @param tokenAddress Address of the token to mint
     * @param to Address to receive the tokens
     * @param value Amount of tokens to mint
     */
    function mintToken(
        address tokenAddress,
        address to,
        uint    value
    )
        external
        onlyAdmin
    {
        IWrappedToken(tokenAddress).mint(to, value);
    }

    /**
     * @notice Burns tokens
     * @dev Can only be called by admin
     * @param tokenAddress Address of the token to burn
     * @param from Address to burn tokens from
     * @param value Amount of tokens to burn
     */
    function burnToken(
        address tokenAddress,
        address from,
        uint    value
    )
        external
        onlyAdmin
    {
        IWrappedToken(tokenAddress).burn(from, value);
    }

    /**
     * @notice Adds a new token
     * @dev Can only be called by owner
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param decimals Number of decimal places
     * Emits:
     * - AddToken event with token details
     */
    function addToken(
        string memory name,
        string memory symbol,
        uint8 decimals
    )
        external
        onlyOwner
    {
        address tokenAddress = address(new WrappedToken(name, symbol, decimals));

        emit AddToken(tokenAddress, name, symbol, decimals);
    }

    /**
     * @notice Adds a new token pair
     * @dev Can only be called by owner
     * @param id ID of the token pair
     * @param aInfo Information about the ancestor token
     * @param fromChainID Source chain ID
     * @param fromAccount Source token address
     * @param toChainID Destination chain ID
     * @param toAccount Destination token address
     * Requirements:
     * - Token pair ID must not exist
     * - Caller must be owner
     * Emits:
     * - AddTokenPair event with pair details
     */
    function addTokenPair(
        uint    id,

        AncestorInfo calldata aInfo,

        uint           fromChainID,
        bytes calldata fromAccount,
        uint           toChainID,
        bytes calldata toAccount
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

    /**
     * @notice Updates an existing token pair
     * @dev Can only be called by owner
     * @param id ID of the token pair to update
     * @param aInfo Updated ancestor token information
     * @param fromChainID Updated source chain ID
     * @param fromAccount Updated source token address
     * @param toChainID Updated destination chain ID
     * @param toAccount Updated destination token address
     * Requirements:
     * - Token pair ID must exist
     * - Caller must be owner
     * Emits:
     * - UpdateTokenPair event with updated details
     */
    function updateTokenPair(
        uint    id,

        AncestorInfo calldata aInfo,

        uint           fromChainID,
        bytes calldata fromAccount,
        uint           toChainID,
        bytes calldata toAccount
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

    /**
     * @notice Removes a token pair
     * @dev Can only be called by owner
     * @param id ID of the token pair to remove
     * Requirements:
     * - Token pair ID must exist
     * - Caller must be owner
     * Emits:
     * - RemoveTokenPair event with the removed ID
     */
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

    /**
     * @notice Updates token information
     * @dev Can only be called by owner
     * @param tokenAddress Address of the token to update
     * @param name New name of the token
     * @param symbol New symbol of the token
     * Emits:
     * - UpdateToken event with updated details
     */
    function updateToken(address tokenAddress, string calldata name, string calldata symbol)
        external
        onlyOwner
    {
        IWrappedToken(tokenAddress).update(name, symbol);

        emit UpdateToken(tokenAddress, name, symbol);
    }

    /**
     * @notice Changes token ownership
     * @dev Can only be called by owner
     * @param tokenAddress Address of the token
     * @param _newOwner Address of the new owner
     */
    function changeTokenOwner(address tokenAddress, address _newOwner) external onlyOwner {
        IWrappedToken(tokenAddress).changeOwner(_newOwner);
    }

    /**
     * @notice Accepts token ownership
     * @dev Can be called by the new owner
     * @param tokenAddress Address of the token
     */
    function acceptTokenOwnership(address tokenAddress) external {
        IWrappedToken(tokenAddress).acceptOwnership();
    }

    /**
     * @notice Transfers token ownership
     * @dev Can only be called by owner
     * @param tokenAddress Address of the token
     * @param _newOwner Address of the new owner
     */
    function transferTokenOwner(address tokenAddress, address _newOwner) external onlyOwner {
        IWrappedToken(tokenAddress).transferOwner(_newOwner);
    }

    /**
     * @notice Gets complete token pair information
     * @param id ID of the token pair
     * @return fromChainID Source chain ID
     * @return fromAccount Source token address
     * @return toChainID Destination chain ID
     * @return toAccount Destination token address
     */
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

    /**
     * @notice Gets simplified token pair information
     * @param id ID of the token pair
     * @return fromChainID Source chain ID
     * @return fromAccount Source token address
     * @return toChainID Destination chain ID
     */
    function getTokenPairInfoSlim(
        uint id
    )
        external
        view
        returns (uint fromChainID, bytes memory fromAccount, uint toChainID)
    {
        fromChainID = mapTokenPairInfo[id].fromChainID;
        fromAccount = mapTokenPairInfo[id].fromAccount;
        toChainID = mapTokenPairInfo[id].toChainID;
    }

    /**
     * @notice Gets token information
     * @param id ID of the token pair
     * @return addr Address of the token
     * @return name Name of the token
     * @return symbol Symbol of the token
     * @return decimals Number of decimal places
     */
    function getTokenInfo(uint id) external view returns (address addr, string memory name, string memory symbol, uint8 decimals) {
        if (mapTokenPairInfo[id].fromChainID == 0) {
            name = '';
            symbol = '';
            decimals = 0;
            addr = address(0);
        } else {
            address instance = bytesToAddress(mapTokenPairInfo[id].toAccount);
            name = IWrappedToken(instance).name();
            symbol = IWrappedToken(instance).symbol();
            decimals = IWrappedToken(instance).decimals();
            addr = instance;
        }
    }

    function getAncestorInfo(uint id) external view returns (bytes memory account, string memory name, string memory symbol, uint8 decimals, uint chainId) {
        account = mapTokenPairInfo[id].aInfo.account;
        name = mapTokenPairInfo[id].aInfo.name;
        symbol = mapTokenPairInfo[id].aInfo.symbol;
        decimals = mapTokenPairInfo[id].aInfo.decimals;
        chainId = mapTokenPairInfo[id].aInfo.chainID;
    }

    function getAncestorSymbol(uint id) external view returns (string memory symbol, uint8 decimals) {
        symbol = mapTokenPairInfo[id].aInfo.symbol;
        decimals = mapTokenPairInfo[id].aInfo.decimals;
    }

    function getAncestorChainID(uint id) external view returns (uint chainID) {
        chainID = mapTokenPairInfo[id].aInfo.chainID;
    }

    function getTokenPairs()
        external
        view
        returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount,
          string[] memory ancestorSymbol, uint8[] memory ancestorDecimals, bytes[] memory ancestorAccount, string[] memory ancestorName, uint[] memory ancestorChainID)
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
        returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount,
          string[] memory ancestorSymbol, uint8[] memory ancestorDecimals, bytes[] memory ancestorAccount, string[] memory ancestorName, uint[] memory ancestorChainID)
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
