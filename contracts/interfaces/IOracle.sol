pragma solidity 0.4.26;

interface IOracle {
  function getDeposit(bytes32 smgID) external view returns (uint);
  function getValue(bytes32 key) external view returns (uint);
  function getValues(bytes32[] keys) external view returns (uint[] values);
  function getStoremanGroupConfig(
    bytes32 id
  ) external view returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes gpk1, bytes gpk2, uint startTime, uint endTime);
}