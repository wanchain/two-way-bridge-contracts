// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

/**
 * Math operations with safety checks
 */

import "../components/Owned.sol";
import "./OracleStorage.sol";

/**
 * @title OracleDelegate
 * @dev Implementation contract for Oracle functionality
 * This contract provides:
 * - Price data management
 * - Storeman group configuration management
 * - Admin role management
 * - Debt status tracking
 */
contract OracleDelegate is OracleStorage, Owned {
  /**
   * @notice Emitted when admin address is changed
   * @param addr New admin address
    */
  event SetAdmin(address addr);
  
  /**
   * @notice Emitted when prices are updated
   * @param keys Array of price keys
   * @param prices Array of new prices
   */
  event UpdatePrice(bytes32[] keys, uint[] prices);
  
  /**
   * @notice Emitted when debt clean status is updated
   * @param id Storeman group ID
   * @param isDebtClean New debt clean status
   */
  event SetDebtClean(bytes32 indexed id, bool isDebtClean);
  
  /**
   * @notice Emitted when storeman group configuration is set
   * @param id Storeman group ID
   * @param status New status
   * @param deposit New deposit amount
   * @param chain Array of chain IDs
   * @param curve Array of curve parameters
   * @param gpk1 First group public key
   * @param gpk2 Second group public key
   * @param startTime New start time
   * @param endTime New end time
   */
  event SetStoremanGroupConfig(bytes32 indexed id, uint8 status, uint deposit, uint[2] chain, uint[2] curve, bytes gpk1, bytes gpk2, uint startTime, uint endTime);
  
  /**
   * @notice Emitted when storeman group status is updated
   * @param id Storeman group ID
   * @param status New status
   */
  event SetStoremanGroupStatus(bytes32 indexed id, uint8 status);
  
  /**
   * @notice Emitted when deposit amount is updated
   * @param id Storeman group ID
   * @param deposit New deposit amount
   */
  event UpdateDeposit(bytes32 indexed id, uint deposit);

  /**
   * @notice Modifier to restrict function access to admin only
   * @dev Throws if called by any account other than admin or owner
    */
  modifier onlyAdmin() {
      require((msg.sender == admin) || (msg.sender == owner), "not admin");
      _;
  }

  /**
   * @notice Updates multiple token prices
   * @dev Can only be called by admin
   * @param keys Array of price keys
   * @param prices Array of new prices
   * Requirements:
   * - Arrays must have the same length
   * - Caller must be admin
   * Emits:
   * - UpdatePrice event with keys and prices
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

  /**
   * @notice Updates deposit amount for a storeman group
   * @dev Can only be called by admin
   * @param smgID Storeman group ID
   * @param amount New deposit amount
   * Requirements:
   * - Caller must be admin
   * Emits:
   * - UpdateDeposit event with group ID and new amount
   */
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

  /**
   * @notice Sets status for a storeman group
   * @dev Can only be called by admin
   * @param id Storeman group ID
   * @param status New status
   * Requirements:
   * - Caller must be admin
   * Emits:
   * - SetStoremanGroupStatus event with group ID and new status
   */
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

  /**
   * @notice Sets complete configuration for a storeman group
   * @dev Can only be called by admin
   * @param id Storeman group ID
   * @param status New status
   * @param deposit New deposit amount
   * @param chain Array of chain IDs
   * @param curve Array of curve parameters
   * @param gpk1 First group public key
   * @param gpk2 Second group public key
   * @param startTime New start time
   * @param endTime New end time
   * Requirements:
   * - Caller must be admin
   * Emits:
   * - SetStoremanGroupConfig event with all parameters
   */
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

  /**
   * @notice Sets debt clean status for a storeman group
   * @dev Can only be called by admin
   * @param storemanGroupId Storeman group ID
   * @param isClean New debt clean status
   * Requirements:
   * - Caller must be admin
   * Emits:
   * - SetDebtClean event with group ID and new status
   */
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

  /**
   * @notice Sets the admin address
   * @dev Can only be called by owner
   * @param addr New admin address
   * Requirements:
   * - Caller must be owner
   * Emits:
   * - SetAdmin event with new admin address
   */
  function setAdmin(
    address addr
  ) external onlyOwner
  {
    admin = addr;

    emit SetAdmin(addr);
  }

  /**
   * @notice Gets price for a specific key
   * @param key Price key
   * @return Current price value
   */
  function getValue(bytes32 key) external view returns (uint) {
    return mapPrices[key];
  }

  /**
   * @notice Gets prices for multiple keys
   * @param keys Array of price keys
   * @return values Array of current prices
   */
  function getValues(bytes32[] calldata keys) external view returns (uint[] memory values) {
    values = new uint[](keys.length);
    for(uint256 i = 0; i < keys.length; i++) {
        values[i] = mapPrices[keys[i]];
    }
  }

  /**
   * @notice Gets deposit amount for a storeman group
   * @param smgID Storeman group ID
   * @return Current deposit amount
   */
  function getDeposit(bytes32 smgID) external view returns (uint) {
    return mapStoremanGroupConfig[smgID].deposit;
  }

  /**
   * @notice Gets complete configuration for a storeman group
   * @param id Storeman group ID
   * @return groupId Group ID
   * @return status Current status
   * @return deposit Current deposit amount
   * @return chain1 First chain ID
   * @return chain2 Second chain ID
   * @return curve1 First curve parameter
   * @return curve2 Second curve parameter
   * @return gpk1 First group public key
   * @return gpk2 Second group public key
   * @return startTime Start time
   * @return endTime End time
   */
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

  /**
   * @notice Gets status information for a storeman group
   * @param id Storeman group ID
   * @return status Current status
   * @return startTime Start time
   * @return endTime End time
   */
  function getStoremanGroupStatus(bytes32 id)
    public
    view
    returns(uint8 status, uint startTime, uint endTime)
  {
    status = mapStoremanGroupConfig[id].status;
    startTime = mapStoremanGroupConfig[id].startTime;
    endTime = mapStoremanGroupConfig[id].endTime;
  }

  /**
   * @notice Checks if a storeman group's debts are clean
   * @param storemanGroupId Storeman group ID
   * @return Whether debts are clean
   */
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