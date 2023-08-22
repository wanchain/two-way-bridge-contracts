// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ICross {
    function setHalt(bool) external;
    function getPartners() external view returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier);
    function currentChainID() external view returns (uint256);
}
