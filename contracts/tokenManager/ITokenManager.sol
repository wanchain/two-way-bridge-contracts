// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;

interface ITokenManager {
  function getTokenPairInfo(uint id) external view
    returns (uint fromChainID, bytes memory fromAccount, uint toChainID, bytes memory toAccount);
  function getTokenInfo(uint id) external view
    returns (address addr, string memory name, string memory symbol, uint8 decimals);
  function getAncestorInfo(uint id) external view
    returns (bytes memory account, bytes memory name, string memory symbol, uint8 decimals, uint chainId);
  function getTokenPairs() external view
    returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals);
  function getTokenPairsByChainID(uint chainID1, uint chainID2) external view
    returns (uint[] memory id, uint[] memory fromChainID, bytes[] memory fromAccount, uint[] memory toChainID, bytes[] memory toAccount, string[] memory ancestorSymbol, uint8[] memory ancestorDecimals);

  function mintToken(uint id, address to, uint value) external;
  function burnToken(uint id, uint value) external;
}