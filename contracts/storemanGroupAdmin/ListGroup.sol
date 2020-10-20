pragma solidity ^0.4.26;
pragma experimental ABIEncoderV2;

import "../components/Admin.sol";
import "./StoremanUtil.sol";



contract ListGroup is Admin  {
  struct Group {
    bytes32 groupId;
    uint startTime;
    uint endTime;
  }

  Group[] groups;
  address public smg;
  address public posAddr;
  mapping(uint=>uint) epochDeposit;

  constructor(address _smg, address _pos) public {
    smg = _smg;
    posAddr = _pos;  
  }

  function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) external  {
    require(smg == msg.sender, "not allow");
    for(uint i=0; i<groups.length; i++){
      require(groups[i].groupId != groupId,"existed");
    }
    Group memory one = Group(groupId, startTime, endTime);
    groups.push(one);
  }

  function setTotalDeposit(uint day, uint value) external {
    require(smg == msg.sender, "not allow");
    epochDeposit[day] = value;
  }

  function getTotalDeposit(uint day) external view returns(uint) {
    return epochDeposit[day];
  }
  
  function getGroups() external view returns (Group[]) {
    return groups;
  }

  function cleanExpiredGroup() external {
    for(uint i=groups.length; i>0; i--) {
        if(groups[i-1].endTime < now){ //  expired.
          if(i < groups.length){
            groups[i-1]= groups[groups.length-1];
          }
          groups.length--;
        } 
    }
  }          
  function getActiveGroupIds(uint epochId) external view returns (bytes32[]) {
    bytes32[] memory activeGroups = new bytes32[](groups.length);
    uint activeCount;
    
    for(uint i=groups.length; i>0; i--) {
      if(StoremanUtil.getDaybyTime(posAddr, groups[i-1].startTime)  <= epochId){
        if(StoremanUtil.getDaybyTime(posAddr, groups[i-1].endTime) > epochId){ //  not expired.
          activeGroups[activeCount] = groups[i-1].groupId;
          activeCount++;
        }
      }
    }
    bytes32[] memory ret = new bytes32[](activeCount);
    for(uint k; k<activeCount; k++) {
      ret[k] = activeGroups[k];
    }
    return ret;
  }
}

