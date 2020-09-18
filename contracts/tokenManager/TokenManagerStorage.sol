
pragma solidity 0.4.26;

import "../components/BasicStorage.sol";

contract TokenManagerStorage is BasicStorage {
    struct AncestorInfo {
      bytes   account;
      string  name;
      string  symbol;
      uint8   decimals;
      uint    chainID;
    }

    struct TokenPairInfo {
      AncestorInfo aInfo;               
      uint      fromChainID;            
      bytes     fromAccount;            
      uint      toChainID;              
      bytes     toAccount;              
    }

    uint public totalTokenPairs = 0;

    mapping(uint => TokenPairInfo) public mapTokenPairInfo;

    mapping(uint => uint) public mapTokenPairIndex;
}