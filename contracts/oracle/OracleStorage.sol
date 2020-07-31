pragma solidity 0.4.26;

import "../components/BasicStorage.sol";

contract OracleStorage is BasicStorage {
  /************************************************************
    **
    ** STRUCTURE DEFINATIONS
    **
    ************************************************************/
  struct StoremanGroupConfig {
    uint    deposit;
    uint8   status;
    uint[2] chain;
    uint[2] curve;
    bytes   gpk1;
    bytes   gpk2;
    uint    startTime;
    uint    endTime;
  }
  /**
    *
    * EVENTS
    *
    */
  event SetAdmin(address addr);
  event UpdatePrice(bytes32[] keys, uint[] prices);
  event UpdateDeposit(bytes32 indexed smgID, uint amount);
  event SetStoremanGroupStatus(bytes32 indexed id, uint8 status);
  event SetStoremanGroupConfig(bytes32 indexed id, uint8 status, uint deposit, uint[2] chain, uint[2] curve,
    bytes gpk1, bytes gpk2, uint startTime, uint endTime);

  /************************************************************
    **
    ** VARIABLES
    **
    ************************************************************/
  // symbol -> price
  mapping(bytes32 => uint) public mapPrices;
  // smgId -> amount
  mapping(bytes32 => uint) public mapStoremanGroupAmount;
  // smgId -> StoremanGroupConfig
  mapping(bytes32 => StoremanGroupConfig) public mapStoremanGroupConfig;

  address public admin;
}