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

/**
 * @title CrossDelegateXinFin
 * @dev Cross-chain delegate contract specifically designed for XinFin network
 * This contract extends CrossDelegateV4 and implements XRC721 and XRC1155 token receiver interfaces
 * to handle cross-chain token transfers on the XinFin network
 */
contract CrossDelegateXinFin is CrossDelegateV4 {
    /**
     * @dev Implementation of the XRC721 token receiver interface
     * @param operator The address which called `safeTransferFrom` function
     * @param from The address which previously owned the token
     * @param tokenId The identifier of the token being transferred
     * @param data Additional data with no specified format
     * @return bytes4 The function selector of this function
     */
    function onXRC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onXRC721Received.selector;
    }

    /**
     * @dev Implementation of the XRC1155 token receiver interface for single token transfers
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the token
     * @param id The identifier of the token being transferred
     * @param value The amount of tokens being transferred
     * @param data Additional data with no specified format
     * @return bytes4 The function selector of this function
     */
    function onXRC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155Received.selector;
    }

    /**
     * @dev Implementation of the XRC1155 token receiver interface for batch token transfers
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the tokens
     * @param ids Array of token identifiers being transferred
     * @param values Array of amounts of tokens being transferred
     * @param data Additional data with no specified format
     * @return bytes4 The function selector of this function
     */
    function onXRC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155BatchReceived.selector;
    }
}
