
pragma solidity ^0.4.24;

interface IWanToken {
    function mint(address, uint) external;
    function burn(address, uint) external;
}