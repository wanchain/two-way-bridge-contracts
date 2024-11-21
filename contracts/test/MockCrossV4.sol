// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

contract MockCrossV4 {
    address public tokenManagerAddr;

    constructor(address _tokenManager) {
        tokenManagerAddr = _tokenManager;
    }

    function currentChainID() external pure returns (uint) {
        return 1;
    }

    function getPartners() external view returns(
        address tokenManager,
        address smgAdminProxy,
        address smgFeeProxy,
        address quota,
        address sigVerifier
    ) {
        return (
            tokenManagerAddr,
            address(0),
            address(0),
            address(0),
            address(0)
        );
    }

    function userLock(
        bytes32 /*smgID*/,
        uint /*tokenPairID*/,
        uint /*value*/,
        bytes calldata /*userAccount*/
    ) external payable {
    }

    function userBurn(
        bytes32 /*smgID*/,
        uint /*tokenPairID*/,
        uint /*value*/,
        uint /*fee*/,
        address /*tokenAccount*/,
        bytes calldata /*userAccount*/
    ) external payable {
    }

    function userLockNFT(
        bytes32 /*smgID*/,
        uint /*tokenPairID*/,
        uint[] memory /*tokenIDs*/,
        uint[] memory /*tokenValues*/,
        bytes memory /*userAccount*/
    ) external payable {
    }
    
    function userBurnNFT(
        bytes32 /*smgID*/,
        uint /*tokenPairID*/,
        uint[] memory /*tokenIDs*/,
        uint[] memory /*tokenValues*/,
        address /*tokenAccount*/,
        bytes memory /*userAccount*/
    ) external payable {
    }
}
