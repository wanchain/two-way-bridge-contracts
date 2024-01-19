from typing import Literal

import pyteal as pt
from pyteal import *
import beaker

@pt.Subroutine(pt.TealType.uint64)
def checkPubKey(X, Y):
    ex = Bytes("base16","ac93e52fc9b47625298fcde0feeed213947de3fe359373556bff7c5f90be863a")
    ey = Bytes("base16","148369bba90e4c36fe19415ff15df2942841ebcba1a063e418c08c594997975b")
    ekhash = Bytes("base16","eff210af2729ffdd83f1abe7c02ec0f73e0157b60ecaf687bda9bfb2884a2dfc")
    eaddr = Bytes("base16","c02Ec0F73E0157b60eCAf687BdA9bFB2884a2DFC")
    khash = Keccak256(Concat(ex, ey))
    addr = Extract(khash, Int(12), Int(20))

    return If(pt.BytesEq(addr, eaddr),  Int(1), Int(0))
    #return If(And(pt.BytesEq(X, ex),pt.BytesEq(Y, ey)),  Int(1), Int(0))

@pt.Subroutine(pt.TealType.bytes)
def convertToEthAddr(X, Y):
    khash = Keccak256(Concat(X, Y))
    addr = Extract(khash, Int(12), Int(20))
    eaddr = Bytes("base16","0x7C5B88e76CF02299e01e9374Ac75C397De3e15D1")
    return addr
    #return If(pt.BytesEq(addr, eaddr),  Int(1), Int(0))




@pt.Subroutine(pt.TealType.uint64)
def eth_ecdsa_validate(hash_value: pt.Expr, signature: pt.Expr) -> pt.Expr:
    """
    Return a 1/0 for valid signature given hash

    Equivalent of OpenZeppelin ECDSA.recover for long 65-byte Ethereum signatures
    https://docs.openzeppelin.com/contracts/2.x/api/cryptography#ECDSA-recover-bytes32-bytes-
    Short 64-byte Ethereum signatures require some changes to the code


    [1] https://github.com/OpenZeppelin/openzeppelin-contracts/blob/5fbf494511fd522b931f7f92e2df87d671ea8b0b/contracts/utils/cryptography/ECDSA.sol#L153


    Note: Unless compatibility with Ethereum or another system is necessary,
    we highly recommend using ed25519_verify instead of ecdsa on Algorand

    WARNING: This code has NOT been audited
    DO NOT USE IN PRODUCTION
    """

    r = pt.Extract(signature, pt.Int(0), pt.Int(32))
    s = pt.Extract(signature, pt.Int(32), pt.Int(32))

    # The recovery ID is shifted by 27 on Ethereum
    # For non-Ethereum signatures, remove the -27 on the line below
    v = pt.Btoi(pt.Extract(signature, pt.Int(64), pt.Int(1))) - pt.Int(27)

    pt.Assert(
        pt.Len(signature) == pt.Int(65),
        pt.Len(hash_value) == pt.Int(32),
        # The following two asserts are to prevent malleability like in [1]
        pt.BytesLe(
            s,
            pt.Bytes(
                "base16",
                "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0",
            ),
        ),
        v <= pt.Int(1),
    ),
    # pt.EcdsaVerify(
    #     pt.EcdsaCurve.Secp256k1,
    #     hash_value,
    #     r,
    #     s,
    #     pt.EcdsaRecover(pt.EcdsaCurve.Secp256k1, hash_value, v, r, s),
    # ),
    pubkey = pt.EcdsaRecover(pt.EcdsaCurve.Secp256k1, hash_value, v, r, s)


    return pubkey.outputReducer(
        lambda x,y: checkPubKey(x, y)
    )
    



"""
This LogicSignature takes two application arguments:
  hash, signature
and returns the validity of the signature given the hash
as written in OpenZeppelin https://docs.openzeppelin.com/contracts/2.x/api/cryptography#ECDSA-recover-bytes32-bytes-
(65-byte signatures only)
"""

app = beaker.Application("EthChecker")


@app.external
def check_eth_sig(
    hash: pt.abi.StaticBytes[Literal[32]],
    signature: pt.abi.StaticBytes[Literal[65]],
    *,
    output: pt.abi.Uint64
) -> pt.Expr:
    # The lsig that will be responsible for validating the
    # incoming signature against the incoming hash
    # When passed to Precompile, it flags the init of the Application
    # to prevent building approval/clear programs until the precompile is
    # compiled so we have access to compiled information (its address for instance)
    # pt.OpUp(mode=pt.OpUpMode.OnCall).maximize_budget(
    #     pt.Int(5000)
    # )
    return pt.Seq(
        # The precompiled lsig should have its address and binary available
        # here so we can use it to make sure we've been called
        # with the correct lsig
        #pt.Assert(pt.Txn.sender() == verifier.address()),
        OpUp(mode=pt.OpUpMode.OnCall).maximize_budget(Int(3000)),
        output.set(eth_ecdsa_validate(hash.get(), signature.get())),
    )

# function verify(bytes32 signature, bytes32 px, bytes32 py, bytes32 e, bytes32 parity, bytes32 message)
@app.external
def check_ecSchnorr_sig(
    signature: pt.abi.StaticBytes[Literal[32]],
    px: pt.abi.StaticBytes[Literal[32]],
    py: pt.abi.StaticBytes[Literal[32]],
    e: pt.abi.StaticBytes[Literal[32]],
    parity: pt.abi.StaticBytes[Literal[32]],
    message: pt.abi.StaticBytes[Literal[32]],
    *,
    output: pt.abi.Uint64
) -> pt.Expr:
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

    esp = pt.Bytes("base16", "0x4d04dbf46179932093b7f50ac68468f73df65ed3d6c2336f1cb6bf8dd2d17e9e")
    eep = pt.Bytes("base16", "0x4e6e6611d35e09c39e131745083c59f28798e45d5e2e0005b18a591e943bcad9")
        # bytes32 sp = bytes32(Q - mulmod(uint256(s), uint256(px), Q));
        # bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));
    sp = BytesMinus(Q, BytesMod(BytesMul(signature.get(), px.get()), Q))
    ep = BytesMinus(Q, BytesMod(BytesMul(e.get(), px.get()), Q))
    assert BytesNeq(sp, Z32)


    v = pt.Btoi(pt.Extract(parity.get(), pt.Int(31), pt.Int(1)) ) - pt.Int(27)
    pubkey = pt.EcdsaRecover(pt.EcdsaCurve.Secp256k1, sp, v, px.get(), ep)
    R =  pubkey.outputReducer(
        lambda x,y: convertToEthAddr(x, y)
    )
    assert BytesNeq(R, Z20)
    hv = pt.Extract(parity.get(), pt.Int(31), pt.Int(1))
    eall = Bytes("base16","0xa1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105")
    # abi.encodePacked(R, uint8(parity), px, message)
    tall = Bytes("base16", "0x7c5b88e76cf02299e01e9374ac75c397de3e15d11b88ef3369fc869985783738c1db70ebb0ab6b91a2e7a4fcc2b70ead6e861fcadbd174910b50affeb72000a49a9fafaddd0da395586559227196fcf1743b2c6fc5")
    rall = pt.Keccak256(Concat(R, hv, px.get(), message.get()))
    ret = If(pt.BytesEq(eall, rall),  Int(1), Int(0))


    #keccak256(abi.encodePacked(R, uint8(parity), px, message))
    #v = pt.Btoi(pt.Extract(signature, pt.Int(64), pt.Int(1))) - pt.Int(27)
    # ekecc = pt.Bytes(
    #             "base16",
    #             "0x90e504d1a56d29c5e2f371ff81de210956043cb8dbcfc9bee6a09ea975c6e1d5",
    #         )
    # eall =   pt.Bytes(
    #             "base16",
    #             "0xc02ec0f73e0157b60ecaf687bda9bfb2884a2dfc",
    #         ) 
    # rall =  R     
    # kecc = Keccak256(rall)
    # ret = If(pt.BytesEq(eall, R),  Int(1), Int(0))

    return pt.Seq(
        # The precompiled lsig should have its address and binary available
        # here so we can use it to make sure we've been called
        # with the correct lsig
        OpUp(mode=pt.OpUpMode.OnCall).maximize_budget(Int(3000)),

        #pt.Assert(BytesEq(eall, rall)),
        output.set(ret),
    )