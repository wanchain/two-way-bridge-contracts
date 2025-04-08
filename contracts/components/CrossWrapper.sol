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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @dev Interface for cross-chain operations
 * 
 * @custom:usage
 * - Defines core cross-chain functionality
 * - Handles token transfers and burns
 * - Manages NFT operations
 */
interface ICross {
    function currentChainID() external view returns (uint);
    function getPartners() external view returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier);
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount) external payable;
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount) external payable;
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount) external payable;
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount) external payable;
}

/**
 * @dev Interface for token pair management
 * 
 * @custom:usage
 * - Manages token pair information
 * - Handles token pair type mapping
 */
interface ITokenManager {
    function getTokenPairInfo(uint id) external view returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
    function mapTokenPairType(uint id) external view returns (uint8);
}

/**
 * @dev Interface for XDC token receiver operations
 * 
 * @custom:usage
 * - Handles XDC token reception
 * - Supports ERC721 and ERC1155 tokens
 */
interface IXDCReceiver {
    function onXRC721Received(address, address, uint256, bytes calldata) external returns (bytes4);
    function onXRC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4);
    function onXRC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external returns (bytes4);
}

/**
 * @title CrossWrapper
 * @dev Contract for wrapping cross-chain operations with token support
 * This contract provides functionality for handling cross-chain token transfers
 * and NFT operations with proper token approvals and safety checks
 * 
 * Key features:
 * - Cross-chain token transfers
 * - NFT cross-chain operations
 * - Token approval management
 * - Safe token transfers
 * 
 * @custom:security
 * - SafeERC20 for token transfers
 * - ERC721Holder for NFT support
 * - ERC1155Holder for batch NFT support
 */
contract CrossWrapper is IXDCReceiver, ERC721Holder, ERC1155Holder {
    using SafeERC20 for IERC20;

    // Cross-chain contract instance
    ICross public cross;
    
    // Token manager contract address
    address public tokenManager;
    
    // Current chain identifier
    uint public currentChainID;

    /**
     * @dev Enum for different token types supported in cross-chain operations
     * 
     * @custom:usage
     * - ERC20: Standard token type
     * - ERC721: Non-fungible token type
     * - ERC1155: Multi-token type
     */
    enum TokenCrossType {ERC20, ERC721, ERC1155}

    /**
     * @dev Event emitted when partner cross-chain operation is performed
     * 
     * @param partner Partner identifier
     * @param _partner Partner identifier (duplicate for compatibility)
     */
    event PartnerCross(string indexed partner, string _partner);

    /**
     * @dev Constructor initializes the contract with cross-chain address
     * 
     * @param _cross Address of the cross-chain contract
     * 
     * @custom:effects
     * - Sets up cross-chain contract
     * - Initializes token manager
     * - Sets current chain ID
     */
    constructor(address _cross) {
        cross = ICross(_cross);
        (tokenManager, , , , ) = cross.getPartners();
        currentChainID = cross.currentChainID();
    }

    /**
     * @dev Locks tokens for cross-chain transfer
     * 
     * @param smgID Storeman group identifier
     * @param tokenPairID Token pair identifier
     * @param value Amount of tokens to lock
     * @param userAccount User account information
     * @param partner Partner identifier
     * 
     * @custom:effects
     * - Transfers tokens from user
     * - Approves cross-chain contract
     * - Initiates cross-chain lock
     */
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount, string memory partner) external payable {
        address tokenAddress = _getTokenAddressFromPairID(tokenPairID);
        if (tokenAddress != address(0)) {
            IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), value);
            IERC20(tokenAddress).forceApprove(address(cross), value);
        }
        cross.userLock{value: msg.value}(smgID, tokenPairID, value, userAccount);
        emit PartnerCross(partner, partner);
    }

    /**
     * @dev Burns tokens for cross-chain transfer
     * 
     * @param smgID Storeman group identifier
     * @param tokenPairID Token pair identifier
     * @param value Amount of tokens to burn
     * @param fee Cross-chain fee
     * @param tokenAccount Token account address
     * @param userAccount User account information
     * @param partner Partner identifier
     * 
     * @custom:effects
     * - Transfers tokens from user
     * - Initiates cross-chain burn
     */
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount, string memory partner) external payable {
        address tokenAddress = _getTokenAddressFromPairID(tokenPairID);
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), value);
        cross.userBurn{value: msg.value}(smgID, tokenPairID, value, fee, tokenAccount, userAccount);
        emit PartnerCross(partner, partner);
    }

    /**
     * @dev Locks NFTs for cross-chain transfer
     * 
     * @param smgID Storeman group identifier
     * @param tokenPairID Token pair identifier
     * @param tokenIDs Array of NFT token IDs
     * @param tokenValues Array of NFT token values
     * @param userAccount User account information
     * @param partner Partner identifier
     * 
     * @custom:effects
     * - Transfers NFTs from user
     * - Approves cross-chain contract
     * - Initiates cross-chain NFT lock
     */
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount, string memory partner) external payable {
        uint8 tokenCrossType = ITokenManager(tokenManager).mapTokenPairType(tokenPairID);
        address tokenScAddr = _getTokenAddressFromPairID(tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < tokenIDs.length; ++idx) {
                IERC721(tokenScAddr).safeTransferFrom(msg.sender, address(this), tokenIDs[idx], "");
            }
            IERC721(tokenScAddr).setApprovalForAll(address(cross), true);
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(tokenScAddr).safeBatchTransferFrom(msg.sender, address(this), tokenIDs, tokenValues, "");
            IERC1155(tokenScAddr).setApprovalForAll(address(cross), true);
        } else {
            require(false, "Invalid NFT type");
        }
        cross.userLockNFT{value: msg.value}(smgID, tokenPairID, tokenIDs, tokenValues, userAccount);
        emit PartnerCross(partner, partner);
    }

    /**
     * @dev Burns NFTs for cross-chain transfer
     * 
     * @param smgID Storeman group identifier
     * @param tokenPairID Token pair identifier
     * @param tokenIDs Array of NFT token IDs
     * @param tokenValues Array of NFT token values
     * @param tokenAccount Token account address
     * @param userAccount User account information
     * @param partner Partner identifier
     * 
     * @custom:effects
     * - Transfers NFTs from user
     * - Initiates cross-chain NFT burn
     */
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount, string memory partner) external payable {
        uint8 tokenCrossType = ITokenManager(tokenManager).mapTokenPairType(tokenPairID);
        address tokenScAddr = _getTokenAddressFromPairID(tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < tokenIDs.length; ++idx) {
                IERC721(tokenScAddr).safeTransferFrom(msg.sender, address(this), tokenIDs[idx], "");
            }
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(tokenScAddr).safeBatchTransferFrom(msg.sender, address(this), tokenIDs, tokenValues, "");
        } else {
            require(false, "Invalid NFT type");
        }
        cross.userBurnNFT{value: msg.value}(smgID, tokenPairID, tokenIDs, tokenValues, tokenAccount, userAccount);
        emit PartnerCross(partner, partner);
    }

    /**
     * @dev Checks if contract supports specific interface
     * 
     * @param interfaceId Interface identifier to check
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Receiver) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId || 
            interfaceId == type(IERC1155Receiver).interfaceId || 
            interfaceId == type(IERC165).interfaceId || 
            interfaceId == type(IXDCReceiver).interfaceId || 
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Handles ERC721 token reception
     * 
     * @return Function selector
     */
    function onXRC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onXRC721Received.selector;
    }

    /**
     * @dev Handles ERC1155 token reception
     * 
     * @return Function selector
     */
    function onXRC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155Received.selector;
    }

    /**
     * @dev Handles batch ERC1155 token reception
     * 
     * @return Function selector
     */
    function onXRC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155BatchReceived.selector;
    }

    /**
     * @dev Gets token address from token pair ID
     * 
     * @param tokenPairID Token pair identifier
     * @return Token contract address
     * 
     * @custom:reverts
     * - If token pair ID is invalid
     */
    function _getTokenAddressFromPairID(uint tokenPairID) internal view returns (address) {
        (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount) = ITokenManager(tokenManager).getTokenPairInfo(tokenPairID);
        if (currentChainID == fromChainID) {
            return _bytesToAddress(fromAccount);
        } else if (currentChainID == toChainID) {
            return _bytesToAddress(toAccount);
        } else {
            revert("Invalid token pair ID");
        }
    }

    /**
     * @dev Converts bytes to address
     * 
     * @param b Bytes to convert
     * @return addr Converted address
     */
    function _bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }
}
