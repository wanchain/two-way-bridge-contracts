pragma solidity 0.4.26;

import "./OracleProxy.sol";

contract OracleStorageV2 is OracleProxy {
  bytes32[2] public currentStoremanIDs;
}