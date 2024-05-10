from typing import Literal

import pyteal as pt
from pyteal import *
import beaker



@Subroutine(TealType.bytes)
def convertToEthAddr(X, Y):
    khash = Keccak256(Concat(X, Y))
    addr = Extract(khash, Int(12), Int(20))
    return addr


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

    sp = BytesMinus(Q, BytesMod(BytesMul(signature, px), Q))
    ep = BytesMinus(Q, BytesMod(BytesMul(e, px), Q))
    assert BytesNeq(sp, Z32)

    v = Btoi(Extract(parity, Int(31), Int(1)) ) - Int(27)
    If(BytesGt(ep, Q2)).Then(
        Pop(v2:=v+Int(1)%Int(2)),
        Pop(ep2:= BytesMinus(Q,ep))
    ).Else(
        Pop(v2:=v),
        Pop(ep2 := ep)
    )

    pubkey = EcdsaRecover(EcdsaCurve.Secp256k1, sp, v2, px, ep2)
    R =  pubkey.outputReducer(
        lambda x,y: convertToEthAddr(x, y)
    )
    assert BytesNeq(R, Z20)
    hv = Extract(parity, Int(31), Int(1))
    rkec256 = Keccak256(Concat(R, hv, px, message))
    return Seq(
        OpUp(mode=OpUpMode.OnCall).ensure_budget(Int(8000),fee_source=OpUpFeeSource.GroupCredit),
        Assert(BytesEq(e, rkec256)), 
        If(BytesEq(e, rkec256),  Int(1), Int(0))
    )

