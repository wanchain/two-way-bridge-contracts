pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";
import "./StoremanType.sol";
import "../lib/PosLib.sol";


library StoremanUtil {
  using SafeMath for uint;

  function calSkWeight(uint standaloneWeight,uint deposit) public pure returns(uint) {
    return deposit*standaloneWeight/10000;
  }

  function getDaybyTime(uint time)  public view returns(uint) {
    return PosLib.getEpochId(time);
  }

  function getSelectedSmNumber(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(uint) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    return group.selectedCount;
  }
}
