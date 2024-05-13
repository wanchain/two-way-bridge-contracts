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
    print('create native asset token')
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
    return asset_id

@pytest.fixture
def mintedAssetID(app_client,app_client_admin, owner):
    print('create minted asset token')
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
        reserve=app_client.app_addr,
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
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
        boxes = [(app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))]
    )
    xfer_txn = transaction.AssetTransferTxn(
        sender=owner.address,
        sp=sp_with_fees,
        receiver=app_client.app_addr,
        amt=100000000000000,
        index=asset_id,
    )
    signed_xfer_txn = xfer_txn.sign(owner.private_key)
    txid = app_client.client.send_transaction(signed_xfer_txn)
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)
    return asset_id

@pytest.fixture
def app_client(owner, admin, user):
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
        feeProxy=user.address,
        boxes=[
            (app_client.app_id, getPrefixAddrKey("mapAdmin", admin.address))
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

@pytest.fixture
def setStoreman(app_client_admin) -> None:
    status = app_client_admin.client.status()
    block_info = app_client_admin.client.block_info(status['last-round'])
    timestamp = block_info['block']['ts']
    smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
    GPK = bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5')
    startTime = timestamp-1000000
    endTime = timestamp+1000000
    status = 5
    tx = app_client_admin.call(
        bridge.setStoremanGroupConfig,
        id=smgID,
        status=status,
        startTime=startTime,
        endTime=endTime,
        gpk=GPK,
        boxes=[
            (app_client_admin.app_id, smgID),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.get_sender())),
        ],
    )
    transaction.wait_for_confirmation(app_client_admin.client, tx.tx_id, 1)
