// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

contract MockCrossV4 {
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
