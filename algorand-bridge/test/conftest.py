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



@pytest.fixture
def owner():
    accts = beaker.localnet.get_accounts()
    return accts[0]    

@pytest.fixture
def admin():
    accts = beaker.localnet.get_accounts()
    return accts[1] 

@pytest.fixture
def feeProxyAddr():
    accts = beaker.localnet.get_accounts()
    return accts[2] 

@pytest.fixture
def app_client(owner, admin):
    print("11111")
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
        boxes=[(app_client.app_id, "pair_list")] * 8,
    )
    result = atc.execute(algod_client, 3)    
    return app_client
