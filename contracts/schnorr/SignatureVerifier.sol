pragma solidity ^0.4.24;

import "../components/Halt.sol";

contract SignatureVerifier is Halt {

    function verify(
        uint256 curveId,
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) external returns (bool) {
        return true;
    }
}
