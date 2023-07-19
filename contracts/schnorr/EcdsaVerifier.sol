// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract EcdsaVerifier {
    // Function to get the address from the public key
    function publicKeyToAddress(bytes memory publicKey) public pure returns (address) {
        return address(uint160(uint256(keccak256(publicKey))));
    }

    // Function to verify the ECDSA signature
    function verify(bytes32 signature, bytes32 groupKeyX, bytes32 groupKeyY, bytes32 r, bytes32 v, bytes32 message)
        public
        view
        returns(bool)
    {
        // Convert bytes32 v into uint8
        uint8 vValue = uint8(uint256(v));

        // Use ecrecover to recover the public key address
        address recoveredAddr = ecrecover(message, vValue, r, signature);

        // Compare the recovered address with the expected address
        bytes memory publicKey = abi.encodePacked(groupKeyX, groupKeyY);
        address expectedAddr = publicKeyToAddress(publicKey);

        return (recoveredAddr == expectedAddr);
    }
}
