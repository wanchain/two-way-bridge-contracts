pragma solidity 0.4.26;

import "../components/BasicStorage.sol";

contract OracleStorage is BasicStorage {

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
  mapping(bytes32 => uint) public mapPrices;

  mapping(bytes32 => StoremanGroupConfig) public mapStoremanGroupConfig;

  address public admin;
}