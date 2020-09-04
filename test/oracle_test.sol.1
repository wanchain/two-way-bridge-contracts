pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/oracle/IOracle.sol";
import "../contracts/oracle/OracleDelegate.sol";
import "../contracts/oracle/OracleProxy.sol";

contract TestOracle {
  function testGetDeposit() public {
    OracleProxy oracleProxy = new OracleProxy();
    OracleDelegate oracleDelegate = new OracleDelegate();
    oracleProxy.upgradeTo(oracleDelegate);
    IOracle iOracle = IOracle(oracleDelegate);

    bytes32 smgID = 0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC;
    uint amount = 256;

    oracleDelegate.updateDeposit(smgID, amount);

    Assert.equal(iOracle.getDeposit(smgID), amount, "getDeposit can called by a contract");
  }
}