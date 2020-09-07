pragma solidity ^0.4.24;

contract FakeMetric {
    uint8 SMCount = 4;
    address config;
    address smg;
    address posLib;

    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId) external returns(uint[]){
        uint[] memory ret = new uint[](SMCount);
        for(uint8 i=0; i<SMCount; i++){
            ret[i] = SMCount - i;
        }
        return ret;
    }
    function getPrdSlshMetric(bytes32 grpId, uint startEpId, uint endEpId) external returns(uint[]){
        uint[] memory ret = new uint[](SMCount);
        for(uint8 i=0; i<SMCount; i++){
        ret[i] = i;
        }
        return ret;
    }

    function getSmSuccCntByEpId(bytes32 grpId, uint epId, uint8 smIndex) external returns(uint){
        return uint(SMCount - smIndex);
    }
    function getSlshCntByEpId(bytes32 grpId, uint epId, uint8 smIndex) external returns(uint){
        return uint(smIndex);
    }
}