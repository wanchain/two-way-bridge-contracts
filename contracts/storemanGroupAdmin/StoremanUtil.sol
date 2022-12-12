pragma solidity ^0.4.24;

import 'openzeppelin-eth/contracts/math/SafeMath.sol';
import "./StoremanType.sol";
import "../interfaces/IPosLib.sol";
import "../lib/CommonTool.sol";

library StoremanUtil {
  using SafeMath for uint;

  function calSkWeight(uint standaloneWeight,uint deposit) public pure returns(uint) {
    return deposit*standaloneWeight/10000;
  }

  function getDaybyTime(address posLib, uint time)  public view returns(uint) {
    return IPosLib(posLib).getEpochId(time);
  }

  function getSelectedSmNumber(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(uint) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    return group.selectedCount;
  }
  function getSelectedStoreman(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(address[]) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    address[] memory storemans = new address[](group.selectedCount);
    for(uint8 i=0; i<group.selectedCount; i++){
      storemans[i] = group.selectedNode[i];
    }
    return storemans;
  }
  function onCurve(bytes pubkey) public view returns (bool) {
    if(pubkey.length != 64) return false;
    uint[2] memory P;
    P[0] =  CommonTool.bytes2uint(pubkey, 0, 32);
    P[1] =  CommonTool.bytes2uint(pubkey, 32, 32);
    uint p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    if (0 == P[0] || P[0] == p || 0 == P[1] || P[1] == p)
      return false;
    uint LHS = mulmod(P[1], P[1], p);
    uint RHS = addmod(mulmod(mulmod(P[0], P[0], p), P[0], p), 7, p);
    return LHS == RHS;
  }
}
