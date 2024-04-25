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




@pytest.mark.admin
def test_Admin(app_client, owner, admin, user) -> None:
    ownerR = app_client.call(
        bridge.owner,
    )
    print("owner:", ownerR.return_value)
    assert ownerR.return_value == owner.address
    print('--------------------', getPrefixAddrKey("mapAdmin", user.address))

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
    print("contents:", contents)
    assert contents == (1).to_bytes(8, "big")

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


    