// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

struct GetFeesParam {
    uint256 srcChainID;
    uint256 destChainID;
}

struct GetFeesReturn {
    uint256 contractFee;
    uint256 agentFee;
}

interface ICrossSC {
    function getFee(GetFeesParam memory param) external view returns(GetFeesReturn memory fee);
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes memory userAccount) external payable;
}

interface ITokenManager {
    function getTokenPairInfo(uint id) external view returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
}

contract FeeSubsidy is Ownable {
    using SafeERC20 for IERC20;

    address public crossSC;
    address public tokenManagerSC;

    // fromChainID -> toChainID -> isSubsidized
    mapping(uint256 => mapping(uint256 => bool)) public subsidized;
    
    constructor(address _crossSC, address _tokenManagerSC) {
        crossSC = _crossSC;
        tokenManagerSC = _tokenManagerSC;
    }

    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes memory userAccount) external {
        uint fromChainID;
        uint toChainID;
        (fromChainID, , toChainID, ) = ITokenManager(tokenManagerSC).getTokenPairInfo(tokenPairID);
        require(subsidized[fromChainID][toChainID], "FeeSubsidy: not subsidized");

        uint256 fee = ICrossSC(crossSC).getFee(GetFeesParam({srcChainID: fromChainID, destChainID: toChainID})).contractFee;
        require(address(this).balance >= fee, "FeeSubsidy: Insufficient fee");

        ICrossSC(crossSC).userLock{value: fee}(smgID, tokenPairID, value, userAccount);
    }

    // Accept direct transfer in native coin for cross fee 
    receive() external payable {}

    function configSubsidy(uint256 fromChainID, uint256 toChainID, bool isSubsidized) external onlyOwner {
        subsidized[fromChainID][toChainID] = isSubsidized;
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
    }
}
