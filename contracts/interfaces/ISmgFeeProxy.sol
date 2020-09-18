
pragma solidity 0.4.26;

interface ISmgFeeProxy {
  function smgTransfer(bytes32 smgID) external payable;
}
