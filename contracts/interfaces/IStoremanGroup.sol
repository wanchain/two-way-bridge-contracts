
pragma solidity ^0.4.24;

interface IStoremanGroup {
    function getSelectedSmNumber(bytes32 groupId) external view returns(uint number);
    function getStoremanGroupConfig(bytes32 id) external view returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2,  bytes gpk1, bytes gpk2, uint startTime, uint endTime);
    function setGpk(bytes32 groupId, bytes gpk1, bytes gpk2) external;
    function setInvalidSm(bytes32 groupId, uint[] indexs, uint8[] slashTypes) external returns(bool isContinue);
    function getThresholdByGrpId(bytes32 groupId) external view returns (uint);
    function getSelectedSmInfo(bytes32 groupId, uint index) external view returns(address wkAddr, bytes PK, bytes enodeId);
    function recordSmSlash(address wk) public;
}
