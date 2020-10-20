pragma solidity ^0.4.24;

interface IListGroup {
  function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) public;
  function getActiveGroupIds(uint day) public view returns (bytes32[]);
  function getTotalDeposit(uint day) public view returns(uint);
  function setTotalDeposit(uint day, uint value) public;
  function cleanExpiredGroup() public;
}