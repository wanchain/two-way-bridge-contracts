// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

interface IOracle {
  function getDeposit(bytes32 smgID) external view returns (uint);
  function getValue(bytes32 key) external view returns (uint);
  function getValues(bytes32[] calldata keys) external view returns (uint[] memory values);
  function getStoremanGroupConfig(
    bytes32 id
  ) external view returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes memory gpk1, bytes memory gpk2, uint startTime, uint endTime);
}