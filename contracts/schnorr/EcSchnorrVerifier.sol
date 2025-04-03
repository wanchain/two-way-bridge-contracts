// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

/**
 * @title EcSchnorrVerifier
 * @dev Implementation of Schnorr signature verification using Ethereum's ecrecover precompile
 * This contract provides a gas-efficient way to verify Schnorr signatures by leveraging
 * the existing ecrecover functionality
 */
contract EcSchnorrVerifier {
    /// @notice The order of the secp256k1 curve group
    /// @dev This is the prime order of the curve, used for modular arithmetic
    uint256 constant public Q =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    /**
     * @notice Internal function to verify a Schnorr signature
     * @dev Uses ecrecover precompile to verify the signature
     * The verification process:
     * 1. Computes sp = Q - (s * px) mod Q
     * 2. Computes ep = Q - (e * px) mod Q
     * 3. Uses ecrecover to recover the signer's address
     * 4. Verifies the challenge e matches the hash of the recovered data
     * @param parity The parity of the public key y-coordinate (27 or 28)
     * @param px The x-coordinate of the public key
     * @param message The 32-byte message that was signed
     * @param e The Schnorr signature challenge
     * @param s The Schnorr signature
     * @return bool indicating whether the signature is valid
     * @dev Throws if sp is zero or if ecrecover fails
     */
    function _verify(
        uint8 parity,
        bytes32 px,
        bytes32 message,
        bytes32 e,
        bytes32 s
    ) public pure returns (bool) {
        // Compute sp = Q - (s * px) mod Q
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        // Compute ep = Q - (e * px) mod Q
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

        require(sp != 0);
        // The ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
        address R = ecrecover(sp, parity, px, ep);
        require(R != address(0), "ecrecover failed");
        // Verify that e matches the hash of the recovered data
        return e == keccak256(
        abi.encodePacked(R, uint8(parity), px, message)
        );
    }

    /**
     * @notice Public function to verify a Schnorr signature
     * @dev Wrapper for the internal _verify function
     * @param signature The signature to verify
     * @param px The x-coordinate of the public key
     * @param groupKeyY The y-coordinate of the public key (unused in this implementation)
     * @param e The Schnorr signature challenge
     * @param parity The parity of the public key y-coordinate
     * @param message The message that was signed
     * @return bool indicating whether the signature is valid
     */
    function verify(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)
        public
        pure
        returns(bool)
    {
        return _verify(uint8(uint256(parity)), px, message, e, signature);
    }
}
