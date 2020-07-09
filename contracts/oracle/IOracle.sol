pragma solidity ^0.4.24;

interface IOracle {
  function getDeposit(bytes32 smgID) external view returns (uint);
  function getValue(bytes32 key) external view returns (uint);
  function getValues(bytes32[] keys) external view returns (uint[] values);
}