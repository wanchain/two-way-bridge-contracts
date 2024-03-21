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

    # esp = pt.Bytes("base16", "897d244de980f57d27dd8596c3a98045e8ba324f7a4e494a2e5b9b322b3a3c7f")
    # eep = pt.Bytes("base16", "8767e54ea0d7d58f5c208d8a07cdc8039843f2649fa022f79d1d441a2c70c6f2")
    # emessage = pt.Bytes("base16", "a3f181fd40cd78f056ee4afd4d1df2a3f1dfbea3c3d72eb64774b95e84fcbd09")
    # epx = pt.Bytes("base16", "8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104")
    # eR =  pt.Bytes("base16", "ff68b594de944dc17d2dfe95f216e71686a75f15")
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
    return Seq(
        OpUp(mode=pt.OpUpMode.OnCall).ensure_budget(Int(8000),fee_source=pt.OpUpFeeSource.GroupCredit),
        # Assert(BytesEq(sp, esp)),
        # Assert(BytesEq(ep, eep)),
        # Assert(BytesEq(R, eR)),
        # Assert(BytesEq(hv, pt.Bytes("base16", "1c"))),
        # Assert(v == Int(1)),
        # Assert(BytesEq(message, emessage)),
        # Assert(BytesEq(px, epx)),
        Assert(pt.BytesEq(e, rkec256)), 
        If(pt.BytesEq(e, rkec256),  Int(1), Int(0))
    )


#function verify(bytes32 signature, bytes32 px, bytes32 /*groupKeyY*/, bytes32 e, bytes32 parity, bytes32 message)    
@app.external(read_only=True)
def verify(
    signature: pt.abi.StaticBytes[Literal[32]],
    px: pt.abi.StaticBytes[Literal[32]],
    py: pt.abi.StaticBytes[Literal[32]],
    e: pt.abi.StaticBytes[Literal[32]],
    parity: pt.abi.StaticBytes[Literal[32]],
    message: pt.abi.StaticBytes[Literal[32]],
    *,
    output: pt.abi.Uint64
) -> pt.Expr:
    signature = signature.get()
    px = px.get()
    py = py.get()
    e = e.get()
    parity = parity.get()
    message = message.get()
    return Seq(
        output.set(check_ecSchnorr_sig(signature, px, py, e, parity, message))
    ) 