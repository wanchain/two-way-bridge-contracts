pragma solidity ^0.4.24;

interface IListGroup {
  function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) public;
  function getActiveGroupIds(uint day) public view returns (bytes32[]);
  function getTotalDeposit(uint day) public view returns(uint);
  function setTotalDeposit(uint day, uint value) public;
  function cleanExpiredGroup() public;
  function getDelegateQuitGroupId(address wkAddr, address deAddr) public view returns (bytes32 groupId, bytes32 nextGroupId);
  function getPartQuitGroupId(address wkAddr, address pnAddr) public view returns (bytes32 groupId, bytes32 nextGroupId);
  function setDelegateQuitGroupId(address wkAddr, address deAddr, bytes32 groupId, bytes32 nextGroupId)external;
  function setPartQuitGroupId(address wkAddr, address pnAddr, bytes32 groupId, bytes32 nextGroupId) external;
}