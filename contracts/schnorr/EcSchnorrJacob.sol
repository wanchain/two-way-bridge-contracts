// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract EcSchnorrJacob{
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
		//require(false,"111111");

		// ecrecover = (m, v, r, s);
		bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
		bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

		require(sp != 0);
		// the ecrecover precompile implementation checks that the `r` and `s`
		// inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
		// check if they're zero.
		if(uint256(ep)>0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0){

			//require(false,"22222");

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

	function _verify2(

			uint8 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
			) public view returns (bool) {
		// ecrecover = (m, v, r, s);
		bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
		bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

		require(sp != 0);
		// the ecrecover precompile implementation checks that the `r` and `s`
		// inputs are non-zero (in this case, `px` and `ep`), thus we don't need to
		// check if they're zero.
		//address R = ecrecover(sp, bytes32(uint256(parity)),px, ep);
		address R = ecrecover(sp, parity,px, ep);
		require(R != address(0), "ecrecover failed");
		return e == keccak256(
				abi.encodePacked(R, uint8(parity), px, message)
				);
	}

	function _ecrecover(
			bytes32 m,
			bytes32 _v,
			bytes32 _r,
			bytes32 _s
			) public view returns (address) {
		assembly {
			let pointer := mload(0x40)

				mstore(pointer, m)
				mstore(add(pointer, 0x20), _v)
				mstore(add(pointer, 0x40), _r)
				mstore(add(pointer, 0x60), _s)

				if iszero(staticcall(not(0), 0x01, pointer, 0x80, pointer, 0x20)) {
					revert(0, 0)
				}

			let size := returndatasize()
				returndatacopy(pointer, 0, size)
				return(pointer,size)
		}
	}

	function TestRecover(
			bytes32 m,
			uint8 v,
			bytes32 r,
			bytes32 s

			) public pure returns (address){
		return ecrecover(m,v,r,s);
	}

	// Function to verify signature
	function verify(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)
		public
		pure
		returns(bool)
		{
			return _verify(uint8(uint256(parity)), px, message, e, signature);
		}

	function verify2(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)
		public
		view	
		returns(bool)
		{
			return _verify2(uint8(uint256(parity)), px, message, e, signature);
		}

	function getM(
			bytes32 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
		     ) public view returns (bytes32) {
		// ecrecover = (m, v, r, s);
		bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
		return sp;

	}

	function getV(
			bytes32 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
		     ) public view returns (bytes32) {
		return bytes32(uint256(parity));
	}

	function getR(
			bytes32 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
		     ) public view returns (bytes32) {
		return px;
	}

	function getS(
			bytes32 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
		     ) public view returns (bytes32) {
		bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));
		return ep;
	}
	function getRByRecover(
			uint8 parity,
			bytes32 px,
			bytes32 message,
			bytes32 e,
			bytes32 s
			) public view returns (address) {
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
		return R;
	}

}
