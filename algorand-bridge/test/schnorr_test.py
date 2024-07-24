import os
import math
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner, AccountTransactionSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn,AssetTransferTxn
from algosdk import account, transaction,logic, util, mnemonic, v2client
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    LogicSigTransactionSigner,
    TransactionWithSigner,
)
from typing import Literal

import beaker
import pyteal as pt
import bridge
from utils import *
import pytest

app = beaker.Application(
    "bridgeTest", 
    descr="Cross chain test entry point", 
    state=bridge.BridgeState()
)


# function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s)
# curveID is useless here.
@app.external
def wVerifySignature(mhash: pt.abi.StaticBytes[Literal[32]],
        PK:pt.abi.StaticBytes[Literal[64]], 
        r: pt.abi.StaticBytes[Literal[64]], 
        s: pt.abi.StaticBytes[Literal[32]],
        *,
        output: pt.abi.Uint64
    )-> pt.Expr:
    return pt.Seq(
        pt.Assert(bridge.verifySignature(mhash.get(), PK.get(), r.get(), s.get()) == pt.Int(1)),
        output.set(bridge.verifySignature(mhash.get(), PK.get(), r.get(), s.get()))
    )

@pytest.mark.schnorr
def test_schnorr(owner):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(2000000)

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 44

    tx1 = app_client.call(
        wVerifySignature,
        mhash=bytes.fromhex("a5cd2c07cc4a833c5b55a114cfebe49e13c19039d70324cca5ad3e6e37e4b657"),
        PK=bytes.fromhex('aceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823'),
        r=bytes.fromhex('d3d5f9bfc2d77ba575cc1407dae0079ebc9999b9744b77ccef3c5dcadda23643000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('41a885d245e69a5af45bc51ff0dad6e3505e45deb7de1db50fc01c69cd8bdc2c'),
        suggested_params = sp_big_fee,
    )
    print("tx1:",tx1.return_value)

    tx2 = app_client.call(
        wVerifySignature,
        mhash=bytes.fromhex("b7ad2a05abd8ba23607acaf4cc139f468f16d584a79f9d797f7fcdc5d8848278"),
        PK=bytes.fromhex('aceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823'),
        r=bytes.fromhex('93d84747a53a6064f38a465a66c888f7457121e20cfb3eba6869b7fbcf91dcf0000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('a6050a51fb7ca8827181c0d855fc6b335d9fcd6895f9f672402d50b652804132'),
        suggested_params = sp_big_fee,
    )
    print("tx2:",tx2.return_value)


@pytest.mark.schnorr
def test_schnorr3(owner):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(2000000)

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 44

    tx3 = app_client.call(
        wVerifySignature,
        mhash=bytes.fromhex("a3f181fd40cd78f056ee4afd4d1df2a3f1dfbea3c3d72eb64774b95e84fcbd09"),
        PK=bytes.fromhex('dacc38e9bc3a8ccf2a0642a1481ab3ba4480d9a804927c84c621ac394d556b01351f98176e1614272a242f6ca31d21b8baead46be6b0c0f354a4fbfb477f6809'),
        r= bytes.fromhex('ea3ce8d8c2aab5c02ff64a24c5ee09adfed6895b4574be6f02137838f773a5ef000000000000000000000000000000000000000000000000000000000000001c'), 
        s= bytes.fromhex('304a0eb440eaa8cec80c859aebafb3657975e11f5cb95f7e1a2d84f93c886b4a'),
        suggested_params = sp_big_fee,
    )
    print("tx3:",tx3.return_value)

@pytest.mark.schnorr
@pytest.mark.xfail
def test_schnorr4(owner):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(2000000)

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 44

    tx3 = app_client.call(
        wVerifySignature,
        mhash=bytes.fromhex("a3f181fd40cd78f056ee4afd4d1df2a3f1dfbea3c3d72eb64774b95e84fcbd0f"),
        PK=bytes.fromhex('dacc38e9bc3a8ccf2a0642a1481ab3ba4480d9a804927c84c621ac394d556b01351f98176e1614272a242f6ca31d21b8baead46be6b0c0f354a4fbfb477f6809'),
        r= bytes.fromhex('ea3ce8d8c2aab5c02ff64a24c5ee09adfed6895b4574be6f02137838f773a5ef000000000000000000000000000000000000000000000000000000000000001c'), 
        s= bytes.fromhex('304a0eb440eaa8cec80c859aebafb3657975e11f5cb95f7e1a2d84f93c886b4a'),
        suggested_params = sp_big_fee,
    )
    print("tx3:",tx3.return_value)




# invalid sig length case, test BytesMinus32
@pytest.mark.schnorr4
def test_schnorr4(owner):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(2000000)

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 44

    tx4 = app_client.call(
        wVerifySignature,
        mhash=bytes.fromhex("ce032d2532db8aed89acb0b1701f9b7313a55b1e8357e10c6c624f6b60d04c84"),
        PK=bytes.fromhex('dacc38e9bc3a8ccf2a0642a1481ab3ba4480d9a804927c84c621ac394d556b01351f98176e1614272a242f6ca31d21b8baead46be6b0c0f354a4fbfb477f6809'),
        r= bytes.fromhex('ed3502a3bd4c133b5bc704673f161ba79ee80f707514d0a0285729a0487ed4b3000000000000000000000000000000000000000000000000000000000000001c'), 
        s= bytes.fromhex('11059dacbcb0b93f28b67597facf317e6d19358b81729e24f789106b1fbb2a49'),
        suggested_params = sp_big_fee,
    )
    print("tx4:",tx4.return_value)