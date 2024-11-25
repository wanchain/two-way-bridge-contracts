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

interface ICross {
    function currentChainID() external view returns (uint);
    function getPartners() external view returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier);
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount) external payable;
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount) external payable;
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount) external payable;
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount) external payable;
}

interface ITokenManager {
    function getTokenPairInfo(uint id) external view returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
    function mapTokenPairType(uint id) external view returns (uint8);
}

interface IXDCReceiver {
    function onXRC721Received(address, address, uint256, bytes calldata) external returns (bytes4);
    function onXRC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4);
    function onXRC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external returns (bytes4);
}

contract CrossWrapper is IXDCReceiver, ERC721Holder, ERC1155Holder {
    using SafeERC20 for IERC20;

    ICross public cross;
    address public tokenManager;
    uint public currentChainID;

    enum TokenCrossType {ERC20, ERC721, ERC1155}

    event PartnerCross(string indexed partner, string _partner);

    constructor(address _cross) {
        cross = ICross(_cross);
        (tokenManager, , , , ) = cross.getPartners();
        currentChainID = cross.currentChainID();
    }

    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount, string memory partner) external payable {
        address tokenAddress = _getTokenAddressFromPairID(tokenPairID);
        if (tokenAddress != address(0)) {
            IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), value);
            IERC20(tokenAddress).approve(address(cross), value);
        }
        cross.userLock{value: msg.value}(smgID, tokenPairID, value, userAccount);
        emit PartnerCross(partner, partner);
    }

    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount, string memory partner) external payable {
        address tokenAddress = _getTokenAddressFromPairID(tokenPairID);
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), value);
        cross.userBurn{value: msg.value}(smgID, tokenPairID, value, fee, tokenAccount, userAccount);
        emit PartnerCross(partner, partner);
    }

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

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Receiver) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId || 
            interfaceId == type(IERC1155Receiver).interfaceId || 
            interfaceId == type(IERC165).interfaceId || 
            interfaceId == type(IXDCReceiver).interfaceId || 
            super.supportsInterface(interfaceId);
    }

    function onXRC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onXRC721Received.selector;
    }

    function onXRC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155Received.selector;
    }

    function onXRC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155BatchReceived.selector;
    }

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

    function _bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }
}
