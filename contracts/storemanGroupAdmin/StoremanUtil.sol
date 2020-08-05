pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";
import "./StoremanType.sol";
import "../lib/PosLib.sol";


library StoremanUtil {
  using SafeMath for uint;

  function calSkWeight(uint standaloneWeight,uint deposit) public  returns(uint) {
    return deposit*standaloneWeight/10000;
  }

  function getDaybyTime(uint time)  public view returns(uint) {
    return time/1;    // TODO; get the day. 
    //return time/60/60/24
    //return PosLib.getEpochId(time);
  }

  function getSelectedSmNumber(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(uint) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    if(group.status == StoremanType.GroupStatus.initial || group.status == StoremanType.GroupStatus.failed){
        return 0;
    }
    return group.memberCountDesign;
  }
}
