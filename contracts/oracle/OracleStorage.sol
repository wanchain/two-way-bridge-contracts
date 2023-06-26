// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract OracleStorage {
  /************************************************************
    **
    ** STRUCTURE DEFINATIONS
    **
    ************************************************************/
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
  /// @notice symbol -> price,
  mapping(bytes32 => uint) public mapPrices;

  /// @notice smgId -> StoremanGroupConfig
  mapping(bytes32 => StoremanGroupConfig) public mapStoremanGroupConfig;

  /// @notice owner and admin have the authority of admin
  address public admin;

  /** Constant Variables */
  bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN");
}