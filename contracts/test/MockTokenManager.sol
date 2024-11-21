// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract MockTokenManager {
    address public mockERC20;
    address public mockERC721;
    address public mockERC1155;

    constructor(address _mockERC20, address _mockERC721, address _mockERC1155) {
        mockERC20 = _mockERC20;
        mockERC721 = _mockERC721;
        mockERC1155 = _mockERC1155;
    }

    function getTokenPairInfo(uint id) external view returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount) {
        address tokenAddr;
        if (id == 1) tokenAddr = mockERC20;
        else if (id == 2) tokenAddr = mockERC721;
        else if (id == 3) tokenAddr = mockERC1155;
        
        fromChainID = 1;
        fromAccount = abi.encodePacked(tokenAddr);
        toChainID = 2;
        toAccount = abi.encodePacked(tokenAddr);
    }

    function mapTokenPairType(uint id) external pure returns (uint8) {
        if (id == 1) return 0; // ERC20
        if (id == 2) return 1; // ERC721
        if (id == 3) return 2; // ERC1155
        return 0;
    }
}