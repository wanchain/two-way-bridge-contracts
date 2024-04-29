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
        uint8 parityOld=parity;
        // ecrecover = (m, v, r, s);
        bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

        require(sp != 0);
        // the ecrecover precompile implementation checks that the `r` and `s`
        // inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
        // check if they're zero.
	if(uint256(ep)>0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0){
		ep=bytes32(Q-uint256(ep));
                if(parity == uint8(27)){
			parity = 28;
                }else{
                        parity=27;
                }
        }
        address R = ecrecover(sp, parity, px, ep);
        require(R != address(0), "ecrecover failed");
        return e == keccak256(
		abi.encodePacked(R, uint8(parityOld), px, message)
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

}
