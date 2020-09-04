pragma solidity^0.4.24;

contract TestSignatureVerifier {

    function verify(
        uint curveId,
        bytes32 signature,
        bytes32 groupKeyX,
        bytes32 groupKeyY,
        bytes32 randomPointX,
        bytes32 randomPointY,
        bytes32 message
    ) public returns (bool) {
        return true;
    }

}