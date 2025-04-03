// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../components/BasicStorage.sol";

/**
 * @title OracleStorage
 * @dev Storage contract for Oracle functionality
 * This contract provides:
 * - Price data storage
 * - Storeman group configuration storage
 * - Admin role management
 */
contract OracleStorage is BasicStorage {
  /************************************************************
    **
    ** STRUCTURE DEFINATIONS
    **
    ************************************************************/
  /**
   * @notice Configuration structure for Storeman Group
   * @dev Contains all necessary parameters for storeman group operation
   * @param deposit Required deposit amount
   * @param chain Array of chain IDs [source, destination]
   * @param curve Array of curve parameters
   * @param gpk1 First group public key
   * @param gpk2 Second group public key
   * @param startTime Start time of the group
   * @param endTime End time of the group
   * @param status Current status of the group
   * @param isDebtClean Whether all debts are cleared
   */
  struct StoremanGroupConfig {
    uint    deposit;
    uint[2] chain;
    uint[2] curve;
    bytes   gpk1;
    bytes   gpk2;
    uint    startTime;
    uint    endTime;
    uint8   status;
    bool    isDebtClean;
  }

  /************************************************************
    **
    ** VARIABLES
    **
    ************************************************************/
  /// @notice Mapping from token symbol to its current price
  /// @dev Used to store and retrieve token prices
  mapping(bytes32 => uint) public mapPrices;

  /// @notice Mapping from storeman group ID to its configuration
  /// @dev Stores all configuration parameters for each storeman group
  mapping(bytes32 => StoremanGroupConfig) public mapStoremanGroupConfig;

  /// @notice Address of the admin account
  /// @dev Admin has special privileges for contract management
  address public admin;
}