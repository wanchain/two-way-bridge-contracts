pragma solidity 0.4.26;

contract WRC20Protocol {

    string public name;
    string public symbol;
    uint8 public decimals;
    mapping (address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;

    uint public totalSupply;

    function balanceOf(address _owner) public view returns (uint balance);

    function transfer(address _to, uint _value) public returns (bool success);

    function transferFrom(address _from, address _to, uint _value) public returns (bool success);

    function approve(address _spender, uint _value) public returns (bool success);

    function allowance(address _owner, address _spender) public view returns (uint remaining);

    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
}
