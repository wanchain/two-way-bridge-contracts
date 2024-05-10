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
import beaker

import bridge
from utils import *
import pytest

tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
algoCoinId = 0
 
@pytest.fixture
def addTokenPair(app_client, nativeAssetID):
    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account=bytes.fromhex("0000000000000000000000000000000000000000"),
        to_chain_id=chainAlgo,
        to_account=nativeAssetID.to_bytes(8, 'big'),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )

@pytest.mark.tokenPair
@pytest.mark.xfail
def test_addTokenPair_notOwner(app_client_admin, nativeAssetID):
    app_client_admin.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account=bytes.fromhex("0000000000000000000000000000000000000000"),
        to_chain_id=chainAlgo, # algorand
        to_account=algoCoinId.to_bytes(8, 'big'),
        boxes=[
        (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )

@pytest.mark.tokenPair
def test_tokenPair(app_client, nativeAssetID):
    print("Adding token pair")

    tx = app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account=bytes.fromhex("0000000000000000000000000000000000000000"),
        to_chain_id=chainAlgo,
        to_account=nativeAssetID.to_bytes(8, 'big'),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )
    logs = tx.tx_info['logs'][0]
    codec = ABIType.from_string(str(bridge.TokenPairLogger().type_spec()))  #(uint64, string, uing64)
    loga = codec.decode(base64.b64decode(logs))
    print("loga:", loga)
    assert loga[0] == 'addTokenPair'
    assert loga[1] == tokenPairId666
    assert loga[2] == chainBase
    assert bytes(bytearray(loga[3])) == bytes.fromhex("0000000000000000000000000000000000000000")
    assert loga[4] == chainAlgo
    assert bytes(bytearray(loga[5])) == nativeAssetID.to_bytes(8, 'big')


    codec = ABIType.from_string(str(bridge.TokenPairInfo().type_spec())) 
    binfo = app_client.get_box_contents(getPrefixKey("mapTokenPairInfo", tokenPairId666))
    info = codec.decode(binfo)
    print("info:", info)
    assert info[0] == tokenPairId666
    assert info[1] == chainBase
    assert bytes(bytearray(info[2])) == bytes.fromhex("0000000000000000000000000000000000000000")
    assert info[3] == chainAlgo
    assert bytes(bytearray(info[4])) == nativeAssetID.to_bytes(8, 'big')

    
@pytest.mark.tokenPair
def test_updateTokenPair(addTokenPair, app_client, nativeAssetID):
    print('update token pair')
    tx = app_client.call(
        bridge.updateTokenPair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        to_chain_id=chainAlgo, # algorand
        to_account=algoCoinId.to_bytes(8, 'big'),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )
    print("----=================addTokenPair tx:", tx.tx_info)
    logs = tx.tx_info['logs'][0]
    codec = ABIType.from_string(str(bridge.TokenPairLogger().type_spec()))  #(uint64, string, uing64)
    loga = codec.decode(base64.b64decode(logs))
    print("loga:", loga)
    assert loga[0] == 'updateTokenPair'
    assert loga[1] == tokenPairId666
    assert loga[2] == chainBase
    assert bytes(bytearray(loga[3])) == bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB")
    assert loga[4] == chainAlgo
    assert bytes(bytearray(loga[5])) == algoCoinId.to_bytes(8, 'big')

    codec = ABIType.from_string(str(bridge.TokenPairInfo().type_spec())) 
    binfo = app_client.get_box_contents(getPrefixKey("mapTokenPairInfo", tokenPairId666))
    info = codec.decode(binfo)
    print("info:", info)
    assert info[0] == tokenPairId666
    assert info[1] == chainBase
    assert bytes(bytearray(info[2])) == bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB")
    assert info[3] == chainAlgo
    assert bytes(bytearray(info[4])) == algoCoinId.to_bytes(8, 'big')


@pytest.mark.tokenPair
@pytest.mark.xfail
def test_updateTokenPair_NotOwner(addTokenPair, app_client_admin, nativeAssetID):
    app_client_admin.call(
        bridge.updateTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client_admin.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )


@pytest.mark.tokenPair
@pytest.mark.xfail
def test_removeTokenPair_NotOwner(addTokenPair, app_client_admin, nativeAssetID):
    app_client_admin.call(
        bridge.removeTokenPair,
        id=tokenPairId666,
        boxes=[
            (app_client_admin.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )


@pytest.mark.tokenPair
def test_removeTokenPair(addTokenPair, app_client, nativeAssetID, admin):
    binfo = app_client.get_box_names()  # 
    print("-------333333binfo:", binfo)   
    assert binfo.count(getPrefixKey("mapTokenPairInfo", tokenPairId666)) == 1
    assert binfo.count(getPrefixAddrKey("mapAdmin", admin.address)) == 1 
    app_client.call(
        bridge.removeTokenPair,
        id=tokenPairId666,
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )
    binfo = app_client.get_box_names()  # 
    print("333333binfo:", binfo)
    assert binfo.count(getPrefixKey("mapTokenPairInfo", tokenPairId666)) == 0
    assert binfo.count(getPrefixAddrKey("mapAdmin", admin.address)) == 1
