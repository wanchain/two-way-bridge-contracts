// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../storemanGroupAdmin/Deposit.sol";

contract TestDeposit {
  using Deposit for Deposit.Records;
  Deposit.Records g;

  constructor() {
    g.total = 0;
    return;
  }

  function add(uint id, uint v) public {
    Deposit.Record memory r = Deposit.Record(id, v);
    g.addRecord(r);
  }

  function clean()public {
    g.clean(); 
  }
  function getTotal() public view returns (uint){
    return g.total;
  }
  function getLastValue() public view returns(uint){
    return g.getLastValue();
  }
  function get(uint id) public view returns(uint value){
    uint  a = g.getValueById(id);
    return  a;
  }
}
