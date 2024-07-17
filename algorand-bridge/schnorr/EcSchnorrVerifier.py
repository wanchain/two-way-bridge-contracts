from typing import Literal

import pyteal as pt
from pyteal import *
import beaker



@Subroutine(TealType.bytes)
def convertToEthAddr(X, Y):
    return Seq(
        Pop(khash := Keccak256(Concat(X, Y))),
        Extract(khash, Int(12), Int(20))
    )



# function verify(bytes32 signature, bytes32 px, bytes32 py, bytes32 e, bytes32 parity, bytes32 message)
@Subroutine(TealType.uint64)
def check_ecSchnorr_sig(signature, px, py, e, parity, message) -> Expr:
    Q =     Bytes(
                "base16",
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
            )
    Q2 =     Bytes(
                "base16",
                "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0",
            )            
    Z32 =     Bytes(
                "base16",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            )        
    Z20 =     Bytes(
                "base16",
                "0x0000000000000000000000000000000000000000",
            )      
    return Seq(
        OpUp(mode=OpUpMode.OnCall).ensure_budget(Int(13000),fee_source=OpUpFeeSource.GroupCredit),
        Pop(sp := BytesMinus(Q, BytesMod(BytesMul(signature, px), Q))),
        Pop(ep := BytesMinus(Q, BytesMod(BytesMul(e, px), Q))),
        Assert(BytesNeq(sp, Z32)),

        Pop(v := Btoi(Extract(parity, Int(31), Int(1)) ) - Int(27)),
        If(BytesGt(ep, Q2)).Then(
            Pop(v2:=(v+Int(1))%Int(2)),
            Pop(ep2:= BytesMinus(Q,ep))
        ).Else(
            Pop(v2:=v),
            Pop(ep2 := ep)
        ),

        Pop(R :=  EcdsaRecover(EcdsaCurve.Secp256k1, sp, v2, px, ep2).outputReducer(
            lambda x,y: convertToEthAddr(x, y)
        )),
        Assert(BytesNeq(R, Z20)),
        Pop(hv := Extract(parity, Int(31), Int(1))),
        Pop(rkec256 := Keccak256(Concat(R, hv, px, message))),
        Assert(BytesEq(e, rkec256)), 
        If(BytesEq(e, rkec256),  Int(1), Int(0))
    )

