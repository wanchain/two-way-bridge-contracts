pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";
import "../lib/PosLib.sol";

library StoremanUtil {
  using SafeMath for uint;

  function calSkWeight(uint standaloneWeight,uint deposit) public  returns(uint) {
    return deposit*standaloneWeight/10;
  }

  function getDaybyTime(uint time)  public view returns(uint) {
    return PosLib.getEpochId(time);
    // return time;    // TODO; get the day. 
    //return time/60/60/24
  }
}