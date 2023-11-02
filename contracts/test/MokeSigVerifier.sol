// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract MokeSigVerifier {

    bool public isVerified = false;

    function setResult(bool isVerified_) external {
        isVerified = isVerified_;
    }

    // Function to verify signature
    function verify(bytes32, bytes32, bytes32, bytes32, bytes32, bytes32)
        public
        view
        returns(bool)
    {
        return isVerified;
    }

}
