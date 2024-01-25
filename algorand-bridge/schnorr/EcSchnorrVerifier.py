from typing import Literal

import pyteal as pt
from pyteal import *
import beaker



@pt.Subroutine(pt.TealType.bytes)
def convertToEthAddr(X, Y):
    khash = Keccak256(Concat(X, Y))
    addr = Extract(khash, Int(12), Int(20))
    # eaddr = Bytes("base16","0x7C5B88e76CF02299e01e9374Ac75C397De3e15D1")
    return addr


app = beaker.Application("EcSchnorrVerifier")



# function verify(bytes32 signature, bytes32 px, bytes32 py, bytes32 e, bytes32 parity, bytes32 message)
@pt.Subroutine(pt.TealType.uint64)
def check_ecSchnorr_sig(signature, px, py, e, parity, message) -> pt.Expr:
    Q =     pt.Bytes(
                "base16",
                "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
            )
    Z32 =     pt.Bytes(
                "base16",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            )        
    Z20 =     pt.Bytes(
                "base16",
                "0x0000000000000000000000000000000000000000",
            )  

    # esp = pt.Bytes("base16", "0x4d04dbf46179932093b7f50ac68468f73df65ed3d6c2336f1cb6bf8dd2d17e9e")
    # eep = pt.Bytes("base16", "0x4e6e6611d35e09c39e131745083c59f28798e45d5e2e0005b18a591e943bcad9")
        # bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        # bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));
    sp = BytesMinus(Q, BytesMod(BytesMul(signature, px), Q))
    ep = BytesMinus(Q, BytesMod(BytesMul(e, px), Q))
    assert BytesNeq(sp, Z32)


    v = pt.Btoi(pt.Extract(parity, pt.Int(31), pt.Int(1)) ) - pt.Int(27)
    pubkey = pt.EcdsaRecover(pt.EcdsaCurve.Secp256k1, sp, v, px, ep)
    R =  pubkey.outputReducer(
        lambda x,y: convertToEthAddr(x, y)
    )
    assert BytesNeq(R, Z20)
    hv = pt.Extract(parity, pt.Int(31), pt.Int(1))
    #eall = Bytes("base16","0xa1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105")
    #tall = Bytes("base16", "0x7c5b88e76cf02299e01e9374ac75c397de3e15d11b88ef3369fc869985783738c1db70ebb0ab6b91a2e7a4fcc2b70ead6e861fcadbd174910b50affeb72000a49a9fafaddd0da395586559227196fcf1743b2c6fc5")
    rkec256 = pt.Keccak256(Concat(R, hv, px, message))
    # ret = If(pt.BytesEq(e, rkec256),  Int(1), Int(0))
    return Seq(
        OpUp(mode=pt.OpUpMode.OnCall).ensure_budget(Int(6000),fee_source=pt.OpUpFeeSource.GroupCredit),
        Assert(pt.BytesEq(e, rkec256)), 
        If(pt.BytesEq(e, rkec256),  Int(1), Int(0))
    )


#function verify(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)    
@app.external(read_only=True)
def verify(
    # curveID: pt.abi.Uint64,
    signature: pt.abi.StaticBytes[Literal[32]],
    px: pt.abi.StaticBytes[Literal[32]],
    py: pt.abi.StaticBytes[Literal[32]],
    e: pt.abi.StaticBytes[Literal[32]],
    parity: pt.abi.StaticBytes[Literal[32]],
    message: pt.abi.StaticBytes[Literal[32]],
    *,
    output: pt.abi.Uint64
) -> pt.Expr:
    # curveID = curveID.get()
    signature = signature.get()
    px = px.get()
    py = py.get()
    e = e.get()
    parity = parity.get()
    message = message.get()
    return Seq(
        # pt.Assert(curveID == pt.Int(0)),
        output.set(check_ecSchnorr_sig(signature, px, py, e, parity, message))
    ) 