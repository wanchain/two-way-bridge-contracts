
pragma solidity ^0.4.24;
contract FakeMetric {
    uint[4] c;
    function getPrdInctMetric(bytes32 grpId, uint startEpId, uint endEpId) external returns(uint[]){
      uint[] memory c2 = new uint[](4);
      for(uint i=0; i<c.length; i++){
        c2[i] = c[i];
      }
      return c2;
    }
    function setC0(uint _c) public {
      c[0] = _c;
    }
    function setC1(uint _c) public {
      c[1] = _c;
      c[2] = _c;
      c[3] = _c;
    }
}
