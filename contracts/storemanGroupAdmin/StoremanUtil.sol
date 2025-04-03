// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./StoremanType.sol";
import "../interfaces/IPosLib.sol";
import "../lib/CommonTool.sol";

/**
 * @title StoremanUtil
 * @dev Utility library for Storeman Group operations
 */
library StoremanUtil {
  using SafeMath for uint;

  /**
   * @notice Calculates the weight of a Storeman node
   * @dev Computes the weight based on standalone weight and deposit amount
   * @param standaloneWeight Base weight of the node
   * @param deposit Deposit amount
   * @return Calculated weight value
   */
  function calSkWeight(uint standaloneWeight,uint deposit) public pure returns(uint) {
    return deposit*standaloneWeight/10000;
  }

  /**
   * @notice Gets the epoch ID for a given timestamp
   * @dev Converts timestamp to epoch ID using POS library
   * @param posLib Address of the POS library contract
   * @param time Timestamp to convert
   * @return ID number
   */
  function getDaybyTime(address posLib, uint time)  public view returns(uint) {
    return IPosLib(posLib).getEpochId(time);
  }

  /**
   * @notice Gets the number of selected Storeman nodes in a group
   * @dev Returns the count of selected nodes for a given group
   * @param data Storeman data storage
   * @param groupId ID of the group
   * @return Number of selected nodes
   */
  function getSelectedSmNumber(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(uint) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    return group.selectedCount;
  }

  /**
   * @notice Gets the list of selected Storeman nodes in a group
   * @dev Returns an array of selected node addresses for a given group
   * @param data Storeman data storage
   * @param groupId ID of the group
   * @return Array of selected node addresses
   */
  function getSelectedStoreman(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(address[] memory) {
    StoremanType.StoremanGroup storage group = data.groups[groupId];
    address[] memory storemans = new address[](group.selectedCount);
    for(uint8 i=0; i<group.selectedCount; i++){
      storemans[i] = group.selectedNode[i];
    }
    return storemans;
  }

  /**
   * @notice Checks if a public key is valid on the curve
   * @dev Validates if the given public key coordinates lie on the secp256k1 curve
   * @param pubkey Public key bytes to validate
   * @return bool indicating if the key is valid
   */
  function onCurve(bytes calldata pubkey) public pure returns (bool) {
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
