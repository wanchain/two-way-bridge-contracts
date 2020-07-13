pragma solidity 0.4.26;

/**
 * Math operations with safety checks
 */

import "../components/Owned.sol";
import "./OracleStorage.sol";

contract OracleDelegate is OracleStorage, Owned {
  /**
    *
    * MODIFIERS
    *
    */
  modifier onlyWhitelist() {
        require(mapWhitelist[msg.sender], "Not in whitelist");
        _;
  }

  /// @notice update price
  /// @dev update price
  /// @param keys tokenPair keys
  /// @param prices token price
  function updatePrice(
    bytes32[] keys,
    uint[] prices
  )
    external
    onlyWhitelist
  {
    require(keys.length == prices.length, "length not same");

    for (uint256 i = 0; i < keys.length; i++) {
      mapPrices[keys[i]] = prices[i];
    }

    emit UpdatePrice(keys, prices);
  }

  function getValue(bytes32 key) external view returns (uint) {
    return mapPrices[key];
  }

  function getValues(bytes32[] keys) external view returns (uint[] values) {
    values = new uint[](keys.length);
    for(uint256 i = 0; i < keys.length; i++) {
        values[i] = mapPrices[keys[i]];
    }
  }

  function updateDeposit(
    bytes32 smgID,
    uint amount
  )
    external
    onlyWhitelist
  {
    mapStoremanGroupAmount[smgID] = amount;

    emit UpdateDeposit(smgID, amount);
  }

  function getDeposit(bytes32 smgID) external view returns (uint) {
    return mapStoremanGroupAmount[smgID];
  }

  function addWhitelist(
    address addr
  )
    external
    onlyOwner
  {
    mapWhitelist[addr] = true;

    emit AddWhitelist(addr);
  }

  function removeWhitelist(
    address addr
  )
    external
    onlyOwner
  {
    if (mapWhitelist[addr]) {
      delete mapWhitelist[addr];
    }
    emit RemoveWhitelist(addr);
  }

  function setStoremanGroupStatus(
    bytes32 id,
    uint8  status
  )
    external
    onlyOwner
  {
    mapStoremanGroupConfig[id].status = status;
  }

  function setStoremanGroupConfig(
    bytes32 id,
    uint8   status,
    uint    deposit,
    uint[2] chain,
    uint[2] curve,
    bytes   gpk1,
    bytes   gpk2,
    uint    startTime,
    uint    endTime
  )
    external
    onlyOwner
  {
    mapStoremanGroupAmount[id] = deposit;
    mapStoremanGroupConfig[id].status = status;
    mapStoremanGroupConfig[id].chain[0] = chain[0];
    mapStoremanGroupConfig[id].chain[1] = chain[1];
    mapStoremanGroupConfig[id].curve[0] = curve[0];
    mapStoremanGroupConfig[id].curve[1] = curve[1];
    mapStoremanGroupConfig[id].gpk1 = gpk1;
    mapStoremanGroupConfig[id].gpk2 = gpk2;
    mapStoremanGroupConfig[id].startTime = startTime;
    mapStoremanGroupConfig[id].endTime = endTime;
  }

  function getStoremanGroupConfig(
    bytes32 id
  )
    external
    view
    returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes gpk1, bytes gpk2, uint startTime, uint endTime)
  {
    groupId = id;
    status = mapStoremanGroupConfig[id].status;
    deposit = mapStoremanGroupAmount[id];
    chain1 = mapStoremanGroupConfig[id].chain[0];
    chain2 = mapStoremanGroupConfig[id].chain[1];
    curve1 = mapStoremanGroupConfig[id].curve[0];
    curve2 = mapStoremanGroupConfig[id].curve[1];
    gpk1 = mapStoremanGroupConfig[id].gpk1;
    gpk2 = mapStoremanGroupConfig[id].gpk2;
    startTime = mapStoremanGroupConfig[id].startTime;
    endTime = mapStoremanGroupConfig[id].endTime;
  }
}