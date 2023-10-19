// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

abstract contract WRC20Protocol {
    /* This is a slight change to the ERC20 base standard.
    function totalSupply() constant returns (uint supply);
    is replaced with:
    uint public totalSupply;
    This automatically creates a getter function for the totalSupply.
    This is moved to the base contract since public getter functions are not
    currently recognised as an implementation of the matching abstract
    function by the compiler.
    */

    /**************************************
     **
     ** VARIABLES
     **
     **************************************/

    string public name;
    string public symbol;
    uint8 public decimals;
    mapping (address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;

    /// total amount of tokens
    uint public totalSupply;

    /// @param _owner The address from which the balance will be retrieved
    /// @return balance The balance of the specified owner address
    function balanceOf(address _owner) public view virtual returns (uint balance);

    /// @notice send `_value` token to `_to` from `msg.sender`
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return success the transfer was successful or not
    function transfer(address _to, uint _value) public virtual returns (bool success);

    /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return success the transfer was successful or not
    function transferFrom(address _from, address _to, uint _value) public virtual returns (bool success);

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return success the approval was successful or not
    function approve(address _spender, uint _value) public virtual returns (bool success);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return remaining of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public virtual view returns (uint remaining);

    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
}