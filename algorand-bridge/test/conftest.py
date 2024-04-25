# File: conftest.py
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

import pytest
from utils import *



@pytest.fixture
def owner():
    accts = beaker.localnet.get_accounts()
    return accts[0]    

@pytest.fixture
def admin():
    accts = beaker.localnet.get_accounts()
    return accts[1] 

@pytest.fixture
def user():
    accts = beaker.localnet.get_accounts()
    return accts[2] 

@pytest.fixture
def feeProxyAddr():
    accts = beaker.localnet.get_accounts()
    return accts[2].address 

@pytest.fixture
def nativeAssetID(app_client, owner):
    print('create demo asset token')
    sp_with_fees = app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    ctxn = AssetCreateTxn(
        owner.address,
        sp_with_fees,
        total=100000000000000,
        default_frozen=False,
        unit_name="MOCK",
        asset_name="MOCK TOKEN",
        manager="",
        reserve=owner.address,
        freeze="",
        clawback="",
        url="https://bridge.wanchain.org",
        decimals=6,
    )
    tx = owner.signer.sign_transactions([ctxn], [0])
    txid = app_client.client.send_transaction(tx[0])
    print('txid', txid)
    receipt = transaction.wait_for_confirmation(app_client.client, txid)
    print('receipt', receipt['asset-index'])
    asset_id = receipt['asset-index']

    # optIn test asset
    print("optIn test asset")
    app_client.fund(200000) # deposit for minimum balance require
    app_client.call(
        bridge.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
    )
    print('done')
    return asset_id


@pytest.fixture
def app_client(owner, admin):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=bridge.app,
        signer=owner.signer,
    ) 
    app_client.create()
    atc = AtomicTransactionComposer()
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(owner.address, sp_with_fees, app_client.app_addr, 2000000),
            signer=owner.signer,
        )
    )
    atc = app_client.add_method_call(
        atc,
        bridge.initialize,
        owner=owner.address,
        admin=admin.address,
        boxes=[
            (app_client.app_id, "pair_list"),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", admin.address)),
        ],
    )
    result = atc.execute(algod_client, 3)    
    return app_client

@pytest.fixture
def app_client_admin(app_client, admin):
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=bridge.app,
        app_id=app_client.app_id,
        signer=admin.signer,
    )
    return  app_client

