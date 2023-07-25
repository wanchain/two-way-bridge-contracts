// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IListGroup {
  function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) external;
  function getActiveGroupIds(uint day) external view returns (bytes32[] memory);
  function getTotalDeposit(uint day) external view returns(uint);
  function setTotalDeposit(uint day, uint value) external;
  function cleanExpiredGroup() external;
  function getDelegateQuitGroupId(address wkAddr, address deAddr) external view returns (bytes32 groupId, bytes32 nextGroupId);
  function getPartQuitGroupId(address wkAddr, address pnAddr) external view returns (bytes32 groupId, bytes32 nextGroupId);
  function setDelegateQuitGroupId(address wkAddr, address deAddr, bytes32 groupId, bytes32 nextGroupId)external;
  function setPartQuitGroupId(address wkAddr, address pnAddr, bytes32 groupId, bytes32 nextGroupId) external;
}