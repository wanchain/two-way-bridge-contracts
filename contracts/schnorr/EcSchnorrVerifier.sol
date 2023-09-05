// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract EcSchnorrVerifier {
    // secp256k1 group order
    uint256 constant public Q =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    // parity := public key y-coord parity (27 or 28)
    // px := public key x-coord
    // message := 32-byte message
    // e := schnorr signature challenge
    // s := schnorr signature
    function _verify(
        uint8 parity,
        bytes32 px,
        bytes32 message,
        bytes32 e,
        bytes32 s
    ) public pure returns (bool) {
        // ecrecover = (m, v, r, s);
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

        require(sp != 0);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        address R = ecrecover(sp, parity, px, ep);
        require(R != address(0), "ecrecover failed");
        return e == keccak256(
        abi.encodePacked(R, uint8(parity), px, message)
        );
    }

    // Function to verify signature
    function verify(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)
        public
        pure
        returns(bool)
    {
        return _verify(uint8(uint256(parity)), px, message, e, signature);
    }

    // Function to verify the ECDSA signature
    function debugVerify(bytes32 s, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)
        public
        pure
        returns(bool, bytes32, bytes32, address)
    {
        // ecrecover = (m, v, r, s);
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

        require(sp != 0);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        address R = ecrecover(sp, uint8(uint256(parity)), px, ep);
        require(R != address(0), "ecrecover failed");
        return (e == keccak256(abi.encodePacked(R, uint8(uint256(parity)), px, message)), sp, ep, R);
    }
}
