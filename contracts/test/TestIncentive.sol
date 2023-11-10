// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface ISmg {
    function partIn(address wkAddr) payable external;
    function partOut(address wkAddr) external;
    function partClaim(address wkAddr) external;

    function delegateIn(address wkAddr) payable external;
    function delegateOut(address wkAddr) external;
    function delegateClaim(address wkAddr) external;
    function delegateIncentiveClaim(address wkAddr) external;

    function stakeIn(bytes32 groupId, bytes calldata PK, bytes calldata enodeID) external payable;
    function stakeOut(address wkAddr) external;
    function stakeIncentiveClaim(address wkAddr) external;
    function stakeClaim(address wkAddr) external;
}


contract TestIncentive1 {
    address smg;
    constructor(address _smg) {
        smg = _smg;
    }

    function delegateIn(address wkAddr) payable external {
        return ISmg(smg).delegateIn{value:msg.value}(wkAddr);
    }
    function delegateOut(address wkAddr) external {
        return ISmg(smg).delegateOut(wkAddr);
    }
    function delegateClaim(address wkAddr) external {
        return ISmg(smg).delegateClaim(wkAddr);
    }
    function delegateIncentiveClaim(address wkAddr) external {
        return ISmg(smg).delegateIncentiveClaim(wkAddr);
    }
    fallback() external payable{
        return ISmg(smg).delegateIncentiveClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
    receive() external payable{
        return ISmg(smg).delegateIncentiveClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
}



contract TestIncentive2 {
    address smg;
    constructor(address _smg) {
        smg = _smg;
    }

    function delegateIn(address wkAddr) payable external {
        return ISmg(smg).delegateIn{value:msg.value}(wkAddr);
    }
    function delegateOut(address wkAddr) external {
        return ISmg(smg).delegateOut(wkAddr);
    }
    function delegateClaim(address wkAddr) external {
        return ISmg(smg).delegateClaim(wkAddr);
    }
    function delegateIncentiveClaim(address wkAddr) external {
        return ISmg(smg).delegateIncentiveClaim(wkAddr);
    }
    fallback() external payable{
        return ISmg(smg).delegateClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
    receive() external payable{
        return ISmg(smg).delegateClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
}

contract TestIncentive3 {
    address smg;
    constructor(address _smg) {
        smg = _smg;
    }
    function partIn(address wkAddr) payable external {
        return ISmg(smg).partIn{value:msg.value}(wkAddr);
    }
    function partOut(address wkAddr) external {
        return ISmg(smg).partOut(wkAddr);
    }
    function partClaim(address wkAddr) external {
        return ISmg(smg).partClaim(wkAddr);
    }

    fallback() external payable{
        return ISmg(smg).partClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
    receive() external payable{
        return ISmg(smg).partClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
}

contract TestIncentive4 {
    address smg;
    constructor(address _smg) {
        smg = _smg;
    }
    function stakeIn(bytes32 groupId, bytes calldata PK, bytes calldata enodeID) external payable{
        return ISmg(smg).stakeIn{value:msg.value}(groupId, PK, enodeID);
    }
    function stakeOut(address wkAddr) external {
        return ISmg(smg).stakeOut(wkAddr);
    }
    function stakeIncentiveClaim(address wkAddr) external {
        return ISmg(smg).stakeIncentiveClaim(wkAddr);
    }
    function stakeClaim(address wkAddr) external {
        return ISmg(smg).stakeClaim(wkAddr);
    }
    fallback() external payable{
        return ISmg(smg).stakeIncentiveClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
    receive() external payable{
        return ISmg(smg).stakeIncentiveClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
}

contract TestIncentive5 {
    address smg;
    constructor(address _smg) {
        smg = _smg;
    }
    function stakeIn(bytes32 groupId, bytes calldata PK, bytes calldata enodeID) external payable{
        return ISmg(smg).stakeIn{value:msg.value}(groupId, PK, enodeID);
    }
    function stakeOut(address wkAddr) external {
        return ISmg(smg).stakeOut(wkAddr);
    }
    function stakeIncentiveClaim(address wkAddr) external {
        return ISmg(smg).stakeIncentiveClaim(wkAddr);
    }
    function stakeClaim(address wkAddr) external {
        return ISmg(smg).stakeClaim(wkAddr);
    }
    fallback() external payable{
        return ISmg(smg).stakeClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
    receive() external payable{
        return ISmg(smg).stakeClaim(address(0x3585b652AFa5F019EE0f30BB1C2c883D87738a6D));
    }
}