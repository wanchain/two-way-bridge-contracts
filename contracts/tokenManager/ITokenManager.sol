
pragma solidity ^0.4.24;

interface ITokenManager {
  function getTokenPairInfo(uint id) external view
    returns (uint fromChainID, bytes fromAccount, uint toChainID, address tokenAddress, bool isDelete);
  function getTokenInfo(uint id) external view
    returns (address addr, string name, string symbol, uint8 decimals);
  function getAncestorInfo(uint id) external view
    returns (bytes account, bytes name, bytes symbol, uint8 decimals, uint chainId);
  function getFeeRatio(uint fromChainID, uint toChainID) external view
    returns (uint);
}