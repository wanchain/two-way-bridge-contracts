// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

struct GetFeesParam {
    uint256 srcChainID;
    uint256 destChainID;
}

struct GetFeesReturn {
    uint256 contractFee;
    uint256 agentFee;
}

interface ICrossSC {
    function currentChainID() external view returns (uint256);

    //ERC20
    function getFee(GetFeesParam memory param) external view returns(GetFeesReturn memory fee);
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes memory userAccount) external payable;
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes memory userAccount) external payable;

    //ERC721, ERC1155
    function getBatchFee(uint tokenPairID, uint batchLength) external view returns(uint);
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount) external payable;
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount) external payable;
}

interface ITokenManager {
    function getTokenPairInfo(uint id) external view returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
    function mapTokenPairType(uint tokenPairID) external view returns (uint8 tokenPairType);
}

contract FeeSubsidy is Ownable, ReentrancyGuard, ERC721Holder, ERC1155Holder {
    using SafeERC20 for IERC20;

    enum TokenCrossType {ERC20, ERC721, ERC1155}

    address public crossSC;
    address public tokenManagerSC;

    // fromChainID -> toChainID -> isSubsidized
    mapping(uint256 => mapping(uint256 => bool)) public subsidized;
    
    constructor(address _crossSC, address _tokenManagerSC) {
        crossSC = _crossSC;
        tokenManagerSC = _tokenManagerSC;
    }

    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes memory userAccount) external payable nonReentrant {
        address token;
        uint fee;
        (token, fee) = getTokenAndFeeByPairID(tokenPairID);
        if (token != address(0)) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), value);
            IERC20(token).safeApprove(crossSC, value);
            ICrossSC(crossSC).userLock{value: fee}(smgID, tokenPairID, value, userAccount);
        } else {
            uint left = msg.value - value;
            if (left > 0) {
                payable(msg.sender).transfer(left);
            }
            ICrossSC(crossSC).userLock{value: fee + value}(smgID, tokenPairID, value, userAccount);
        }
    }

    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint _fee, address tokenAccount, bytes memory userAccount) external payable nonReentrant {
        uint fee;
        (, fee) = getTokenAndFeeByPairID(tokenPairID);
        IERC20(tokenAccount).safeTransferFrom(msg.sender, address(this), value);
        ICrossSC(crossSC).userBurn{value: fee}(smgID, tokenPairID, value, _fee, tokenAccount, userAccount);
    }

    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount) public payable nonReentrant {
        address token;
        uint fee;
        (token, fee) = getTokenAndFeeByPairID(tokenPairID);

        uint8 tokenCrossType = ITokenManager(tokenManagerSC).mapTokenPairType(tokenPairID);

        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < tokenIDs.length; ++idx) {
                IERC721(token).safeTransferFrom(msg.sender, address(this), tokenIDs[idx], "");
            }
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(token).safeBatchTransferFrom(msg.sender, address(this), tokenIDs, tokenValues, "");
        } else {
            require(false, "Invalid NFT type");
        }

        // approve for all, erc721 and erc1155 same function
        IERC721(token).setApprovalForAll(crossSC, true);
        ICrossSC(crossSC).userLockNFT{value: fee}(smgID, tokenPairID, tokenIDs, tokenValues, userAccount);
    }

    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount) public payable nonReentrant {
        uint fee;
        (, fee) = getTokenAndFeeByPairID(tokenPairID);

        uint8 tokenCrossType = ITokenManager(tokenManagerSC).mapTokenPairType(tokenPairID);
        if (tokenCrossType == uint8(TokenCrossType.ERC721)) {
            for(uint idx = 0; idx < tokenIDs.length; ++idx) {
                IERC721(tokenAccount).safeTransferFrom(msg.sender, address(this), tokenIDs[idx], "");
            }
        } else if(tokenCrossType == uint8(TokenCrossType.ERC1155)) {
            IERC1155(tokenAccount).safeBatchTransferFrom(msg.sender, address(this), tokenIDs, tokenValues, "");
        } else {
            require(false, "Invalid NFT type");
        }
        ICrossSC(crossSC).userBurnNFT{value: fee}(smgID, tokenPairID, tokenIDs, tokenValues, tokenAccount, userAccount);
    }

    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    function getTokenAndFeeByPairID(uint tokenPairID) public view returns (address token, uint fee) {
        uint fromChainID;
        uint toChainID;
        bytes memory fromAccount;
        bytes memory toAccount;
        (fromChainID, fromAccount, toChainID, toAccount) = ITokenManager(tokenManagerSC).getTokenPairInfo(tokenPairID);
        require(subsidized[fromChainID][toChainID] || subsidized[toChainID][fromChainID], "FeeSubsidy: not subsidized");

        uint currentChainID = ICrossSC(crossSC).currentChainID();
        if (currentChainID == fromChainID) {
            fee = ICrossSC(crossSC).getFee(GetFeesParam({srcChainID: currentChainID, destChainID: toChainID})).contractFee;
            token = bytesToAddress(fromAccount);
        } else if (currentChainID == toChainID) {
            fee = ICrossSC(crossSC).getFee(GetFeesParam({srcChainID: currentChainID, destChainID: fromChainID})).contractFee;
            token = bytesToAddress(toAccount);
        } else {
            require(false, "Invalid token pair");
        }
        
        require(address(this).balance >= fee, "FeeSubsidy: Insufficient fee");
    }

    // Accept direct transfer in native coin for cross fee 
    receive() external payable {}

    function configSubsidy(uint256 fromChainID, uint256 toChainID, bool isSubsidized) external onlyOwner {
        subsidized[fromChainID][toChainID] = isSubsidized;
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
    }

    // XDC NFT receive need to implement these functions
    function onXRC721Received(address, address, uint256, bytes memory)
        external
        pure
        returns (bytes4)
    {
        return this.onXRC721Received.selector;
    }

    function onXRC1155Received(address, address, uint256, uint256, bytes memory)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155Received.selector;
    }

    function onXRC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory)
        external
        pure
        returns(bytes4)
    {
        return this.onXRC1155BatchReceived.selector;
    }
}
