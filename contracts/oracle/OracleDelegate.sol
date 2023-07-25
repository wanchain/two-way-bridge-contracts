// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * Math operations with safety checks
 */

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../components/Owned.sol";
import "./OracleStorage.sol";

contract OracleDelegate is Initializable, Owned, OracleStorage {
  /**
    *
    * EVENTS
    *
    */
  event SetAdmin(address addr);
  event UpdatePrice(bytes32[] keys, uint[] prices);
  event SetDebtClean(bytes32 indexed id, bool isDebtClean);
  event SetStoremanGroupConfig(bytes32 indexed id, uint8 status, uint deposit, uint[2] chain, uint[2] curve, bytes gpk1, bytes gpk2, uint startTime, uint endTime);
  event SetStoremanGroupStatus(bytes32 indexed id, uint8 status);
  event UpdateDeposit(bytes32 indexed id, uint deposit);

  /**
    *
    * MODIFIERS
    *
    */

  modifier onlyAdmin() {
      require((msg.sender == admin) || (msg.sender == owner), "not admin");
      _;
  }

  /* initializer */
  function initialize() external initializer {
      owner = msg.sender;
  }

  /**
  *
  * MANIPULATIONS
  *
  */

  function updatePrice(
    bytes32[] calldata keys,
    uint[] calldata prices
  )
    external
    onlyAdmin
  {
    require(keys.length == prices.length, "length not same");

    for (uint256 i = 0; i < keys.length; i++) {
      mapPrices[keys[i]] = prices[i];
    }

    emit UpdatePrice(keys, prices);
  }

  function updateDeposit(
    bytes32 smgID,
    uint amount
  )
    external
    onlyAdmin
  {
    mapStoremanGroupConfig[smgID].deposit = amount;

    emit UpdateDeposit(smgID, amount);
  }

  function setStoremanGroupStatus(
    bytes32 id,
    uint8  status
  )
    external
    onlyAdmin
  {
    mapStoremanGroupConfig[id].status = status;

    emit SetStoremanGroupStatus(id, status);
  }

  function setStoremanGroupConfig(
    bytes32 id,
    uint8   status,
    uint    deposit,
    uint[2] calldata chain,
    uint[2] calldata curve,
    bytes   calldata gpk1,
    bytes   calldata gpk2,
    uint    startTime,
    uint    endTime
  )
    external
    onlyAdmin
  {
    mapStoremanGroupConfig[id].deposit = deposit;
    mapStoremanGroupConfig[id].status = status;
    mapStoremanGroupConfig[id].chain[0] = chain[0];
    mapStoremanGroupConfig[id].chain[1] = chain[1];
    mapStoremanGroupConfig[id].curve[0] = curve[0];
    mapStoremanGroupConfig[id].curve[1] = curve[1];
    mapStoremanGroupConfig[id].gpk1 = gpk1;
    mapStoremanGroupConfig[id].gpk2 = gpk2;
    mapStoremanGroupConfig[id].startTime = startTime;
    mapStoremanGroupConfig[id].endTime = endTime;

    emit SetStoremanGroupConfig(id, status, deposit, chain, curve, gpk1, gpk2, startTime, endTime);
  }

  function setDebtClean(
    bytes32 storemanGroupId,
    bool isClean
  )
    external
    onlyAdmin
  {
    mapStoremanGroupConfig[storemanGroupId].isDebtClean = isClean;

    emit SetDebtClean(storemanGroupId, isClean);
  }

  function setAdmin(
    address addr
  ) external onlyOwner
  {
    admin = addr;

    emit SetAdmin(addr);
  }

  function getValue(bytes32 key) external view returns (uint) {
    return mapPrices[key];
  }

  function getValues(bytes32[] calldata keys) external view returns (uint[] memory values) {
    values = new uint[](keys.length);
    for(uint256 i = 0; i < keys.length; i++) {
        values[i] = mapPrices[keys[i]];
    }
  }

  function getDeposit(bytes32 smgID) external view returns (uint) {
    return mapStoremanGroupConfig[smgID].deposit;
  }

  function getStoremanGroupConfig(
    bytes32 id
  )
    external
    view
    returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes memory gpk1, bytes memory gpk2, uint startTime, uint endTime)
  {
    groupId = id;
    status = mapStoremanGroupConfig[id].status;
    deposit = mapStoremanGroupConfig[id].deposit;
    chain1 = mapStoremanGroupConfig[id].chain[0];
    chain2 = mapStoremanGroupConfig[id].chain[1];
    curve1 = mapStoremanGroupConfig[id].curve[0];
    curve2 = mapStoremanGroupConfig[id].curve[1];
    gpk1 = mapStoremanGroupConfig[id].gpk1;
    gpk2 = mapStoremanGroupConfig[id].gpk2;
    startTime = mapStoremanGroupConfig[id].startTime;
    endTime = mapStoremanGroupConfig[id].endTime;
  }

  function getStoremanGroupStatus(bytes32 id)
    public
    view
    returns(uint8 status, uint startTime, uint endTime)
  {
    status = mapStoremanGroupConfig[id].status;
    startTime = mapStoremanGroupConfig[id].startTime;
    endTime = mapStoremanGroupConfig[id].endTime;
  }

  function isDebtClean(
    bytes32 storemanGroupId
  )
    external
    view
    returns (bool)
  {
    return mapStoremanGroupConfig[storemanGroupId].isDebtClean;
  }

}
