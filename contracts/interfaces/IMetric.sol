
pragma solidity ^0.4.24;

interface IMetric {

    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId) external returns(uint[]);
    function getPrdSlshMetric(bytes32 grpId, uint startEpId, uint endEpId) external returns(uint[]);

    function getSmSuccCntByEpId(bytes32 grpId, uint epId, uint8 smIndex) external returns(uint);
    function getSlshCntByEpId(bytes32 grpId, uint epId, uint8 smIndex) external returns(uint);
}