pragma solidity ^0.4.24;

contract TestXHash {
    /* uintData */
    function calcHashX(bytes32 x) external pure returns (bytes32)
    {
        bytes32 xHash = sha256(abi.encodePacked(x));
        return xHash;
    }

}