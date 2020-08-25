pragma solidity ^0.4.26;

import "../storemanGroupAdmin/Deposit.sol";

contract TestDeposit {
  using Deposit for Deposit.Records;
  Deposit.Records g;

  constructor()public{
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
  function get(uint id) public view returns(uint value){
    uint  a = g.getValueById(id);
    return  a;
  }
}
