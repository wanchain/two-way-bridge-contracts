// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/Admin.sol";
import "./StoremanUtil.sol";

/**
 * @title ListGroup
 * @dev Contract for managing storeman group lists and their lifecycle
 * This contract handles the creation, tracking, and expiration of storeman groups
 * 
 * Key features:
 * - Active group management
 * - Group lifecycle tracking
 * - Delegate and participant quit group tracking
 * - Epoch deposit tracking
 * 
 * @custom:security
 * - Access control through Admin contract
 * - Restricted function access to StoremanGroup contract
 * - Safe group management operations
 */
contract ListGroup is Admin  {
  /**
    * @dev Structure representing a storeman group
    * 
    * @param groupId Unique identifier for the group
    * @param startTime Timestamp when the group becomes active
    * @param endTime Timestamp when the group expires
    * 
    * @custom:usage
    * - Used to track group lifecycle
    * - Manages group validity periods
    * - Supports group expiration checks
    */
  struct Group {
    bytes32 groupId;
    uint startTime;
    uint endTime;
  }

  // Array of all created groups
  Group[] groups;
    
  // Address of the StoremanGroup contract
  address public smg;
    
  // Address of the POS (Proof of Stake) contract
  address public posAddr;
    
  // Mapping of epoch days to total deposits
  mapping(uint=>uint) epochDeposit;
    
  // Mapping of work address and delegate address to quit group ID
  mapping(address=>mapping(address=>bytes32)) delegateQuitGroupId;
    
  // Mapping of work address and delegate address to next group ID after quit
  mapping(address=>mapping(address=>bytes32)) delegateQuitNextGroupId;
    
  // Mapping of work address and participant address to quit group ID
  mapping(address=>mapping(address=>bytes32)) partQuitGroupId;
    
  // Mapping of work address and participant address to next group ID after quit
  mapping(address=>mapping(address=>bytes32)) partQuitNextGroupId;

  /**
    * @dev Constructor initializes the contract with StoremanGroup and POS addresses
    * 
    * @param _smg Address of the StoremanGroup contract
    * @param _pos Address of the POS contract
    */
  constructor(address _smg, address _pos) {
    smg = _smg;
    posAddr = _pos;  
  }

  /**
    * @dev Sets the quit group IDs for a delegate
    * 
    * @param wkAddr Work address of the storeman
    * @param deAddr Address of the delegate
    * @param groupId Current group ID
    * @param nextGroupId Next group ID after quit
    * 
    * @custom:requirements
    * - Caller must be the StoremanGroup contract
    * 
    * @custom:effects
    * - Updates delegate quit group mappings
    */
  function setDelegateQuitGroupId(address wkAddr, address deAddr, bytes32 groupId, bytes32 nextGroupId)external {
    require(smg == msg.sender, "not allow");
    delegateQuitGroupId[wkAddr][deAddr] = groupId;
    delegateQuitNextGroupId[wkAddr][deAddr] = nextGroupId;
  }

  /**
    * @dev Sets the quit group IDs for a participant
    * 
    * @param wkAddr Work address of the storeman
    * @param pnAddr Address of the participant
    * @param groupId Current group ID
    * @param nextGroupId Next group ID after quit
    * 
    * @custom:requirements
    * - Caller must be the StoremanGroup contract
    * 
    * @custom:effects
    * - Updates participant quit group mappings
    */
  function setPartQuitGroupId(address wkAddr, address pnAddr, bytes32 groupId, bytes32 nextGroupId) external {
    require(smg == msg.sender, "not allow");
    partQuitGroupId[wkAddr][pnAddr] = groupId;
    partQuitNextGroupId[wkAddr][pnAddr] = nextGroupId;
  }

  /**
    * @dev Retrieves quit group IDs for a delegate
    * 
    * @param wkAddr Work address of the storeman
    * @param deAddr Address of the delegate
    * @return groupId Current group ID
    * @return nextGroupId Next group ID after quit
    */
  function getDelegateQuitGroupId(address wkAddr, address deAddr) external view returns (bytes32 groupId, bytes32 nextGroupId){
    return (delegateQuitGroupId[wkAddr][deAddr], delegateQuitNextGroupId[wkAddr][deAddr]);
  }

  /**
    * @dev Retrieves quit group IDs for a participant
    * 
    * @param wkAddr Work address of the storeman
    * @param pnAddr Address of the participant
    * @return groupId Current group ID
    * @return nextGroupId Next group ID after quit
    */
  function getPartQuitGroupId(address wkAddr, address pnAddr) external view returns (bytes32 groupId, bytes32 nextGroupId){
    return (partQuitGroupId[wkAddr][pnAddr], partQuitNextGroupId[wkAddr][pnAddr]);
  }

  /**
    * @dev Adds a new active group
    * 
    * @param groupId Unique identifier for the new group
    * @param startTime Timestamp when the group becomes active
    * @param endTime Timestamp when the group expires
    * 
    * @custom:requirements
    * - Caller must be the StoremanGroup contract
    * - Group ID must not already exist
    * 
    * @custom:effects
    * - Adds new group to the groups array
    */
  function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) external  {
    require(smg == msg.sender, "not allow");
    for(uint i=0; i<groups.length; i++){
      require(groups[i].groupId != groupId,"existed");
    }
    Group memory one = Group(groupId, startTime, endTime);
    groups.push(one);
  }

  /**
    * @dev Sets the total deposit for a specific day
    * 
    * @param day The day to set the deposit for
    * @param value The deposit amount
    * 
    * @custom:requirements
    * - Caller must be the StoremanGroup contract
    */
  function setTotalDeposit(uint day, uint value) external {
    require(smg == msg.sender, "not allow");
    epochDeposit[day] = value;
  }

  /**
    * @dev Retrieves the total deposit for a specific day
    * 
    * @param day The day to query
    * @return The total deposit amount for the specified day
    */
  function getTotalDeposit(uint day) external view returns(uint) {
    return epochDeposit[day];
  }

  /**
    * @dev Returns all groups
    * 
    * @return Array of all Group structs
    */
  function getGroups() external view returns (Group[] memory) {
    return groups;
  }

  /**
    * @dev Removes expired groups from the list
    * 
    * @custom:effects
    * - Removes groups where endTime is less than current block timestamp
    * - Maintains array order by moving last element to removed position
    */
  function cleanExpiredGroup() external {
    for(uint i=groups.length; i>0; i--) {
        if(groups[i-1].endTime < block.timestamp){ //  expired.
          if(i < groups.length){
            groups[i-1]= groups[groups.length-1];
          }
          groups.pop();
        } 
    }
  }          

  /**
    * @dev Returns active group IDs for a specific epoch
    * 
    * @param epochId The epoch ID to query
    * @return Array of active group IDs
    * 
    * @custom:effects
    * - Filters groups based on epoch ID
    * - Returns only groups that are currently active
    */
  function getActiveGroupIds(uint epochId) external view returns (bytes32[] memory) {
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

