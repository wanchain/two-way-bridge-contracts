import os
import math
from typing import cast

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
import base64

import bridge
from utils import *
import pytest


@pytest.mark.admin
def test_AdminAuth1(app_client, owner, admin, user) -> None:
    admin_client = app_client.prepare(signer=admin.signer)
    adminKey = getPrefixAddrKey("mapAdmin", user.address)
    try:
        admin_client.call(
            bridge.addAdmin,
            adminAccount=user.address,
            boxes=[
                (app_client.app_id, adminKey),
            ]    
        )
    except Exception as e: 
        print("test_AdminAuth1:", e.message)
        return
    assert False

@pytest.mark.admin
def test_AdminAuth2(app_client, owner, admin, user) -> None:
    admin_client = app_client.prepare(signer=admin.signer)
    adminKey = getPrefixAddrKey("mapAdmin", user.address)
    try:
        admin_client.call(
            bridge.removeAdmin,
            adminAccount=user.address,
            boxes=[
                (app_client.app_id, adminKey),
            ]    
        )
    except Exception as e: 
        print("test_AdminAuth2:",e.message)
        return
    assert False

@pytest.mark.admin
def test_Admin(app_client, owner, admin, user) -> None:
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('owner')
    ownerv = encode_address(bytes.fromhex(value1))    
    assert ownerv == owner.address

    adminKey = getPrefixAddrKey("mapAdmin", user.address)
    app_client.call(
        bridge.addAdmin,
        adminAccount=user.address,
        boxes=[
            (app_client.app_id, adminKey),
        ]    
    )
    allbox = app_client.get_box_names()
    print("allbox.count(adminKey):", allbox.count(adminKey))
    assert allbox.count(adminKey) == 1    
    contents = app_client.get_box_contents(adminKey)
    assert contents == (1).to_bytes(8, "big")
    assert int.from_bytes(contents, 'big') == 1

    app_client.call(
        bridge.removeAdmin,
        adminAccount=user.address,
        boxes=[
            (app_client.app_id, adminKey),
        ]    
    )
    allbox = app_client.get_box_names()
    print("allbox.count(adminKey):", allbox.count(adminKey))
    assert allbox.count(adminKey) == 0

    app_client.call(
        bridge.transferOwner,
        _newOwner=user.address,
    )
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('owner')
    ownerv = encode_address(bytes.fromhex(value1))    
    print("-----------ownerv:", ownerv)
    assert ownerv == user.address



@pytest.mark.initialize
def test_initialize(owner, admin, user) -> None:    
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=bridge.app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(900000) # Min 768600

    tx = app_client.call(
        bridge.initialize,
        owner=owner.address,
        updateOwner=owner.address,
        admin=admin.address,
        feeProxy=user.address,
        oracleAdmin=admin.address,
        boxes=[
            (app_client.app_id, getPrefixAddrKey("mapAdmin", admin.address)),
        ],
    )
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('owner')
    ownerv = encode_address(bytes.fromhex(value1))    
    print("ownerv:", ownerv)
    assert ownerv == owner.address

    stateAll = app_client.get_global_state()
    initialized = stateAll.get('initialized')
    assert initialized == 1
    adminKey = getPrefixAddrKey("mapAdmin", admin.address)
    adminv = app_client.get_box_contents(adminKey)
    assert int.from_bytes(adminv,'big') == 1

    try:
        tx = app_client.call(
            bridge.initialize,
            owner=owner.address,
            updateOwner=owner.address,
            admin=admin.address,
            feeProxy=user.address,
            oracleAdmin=admin.address,
            boxes=[
                (app_client.app_id, getPrefixAddrKey("mapAdmin", admin.address)),
            ],
        )
    except Exception as e:
        print("only invoke initialize once, pass")
        return    
    assert False


@pytest.mark.initialize
def test_initialize_notOwner(owner, admin) -> None:    
    algod_client = beaker.localnet.get_algod_client()
    app_client = beaker.client.ApplicationClient(
        client=algod_client,
        app=bridge.app,
        signer=owner.signer,
    ) 
    app_client.create()
    app_client.fund(900000) # Min 768600

    admin_client = app_client.prepare(signer=admin.signer)
    try:
        tx = admin_client.call(
            bridge.initialize,
            owner=owner.address,
            admin=admin.address,
            updateOwner=owner.address,
            feeProxy=owner.address,
            boxes=[
                (app_client.app_id, getPrefixAddrKey("mapAdmin", admin.address)),
            ],
        )
        assert False
    except Exception as e:
        print("only creator can initialize, pass")
        return

    assert False