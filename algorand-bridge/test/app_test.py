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

@pytest.mark.xfail(True, run=True, reason='not admin')
@pytest.mark.appManage
def test_delete(app_client):
    tx = app_client.delete()

@pytest.mark.xfail(True, run=True, reason='not admin')
@pytest.mark.appManage
def test_updateAdmin(app_client_admin):
    tx = app_client_admin.update()

@pytest.mark.appManage
def test_update1(app_client, user):
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('updateOwner')
    uo = encode_address(bytes.fromhex(value1))

    app_client =  app_client.prepare(user.signer, user.address)
    tx = app_client.update()
    print("tx:", tx)



@pytest.mark.xfail(True, run=True, reason='not owner')
@pytest.mark.appManage
def test_update2(app_client):
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('updateOwner')
    uo = encode_address(bytes.fromhex(value1))
    print('uo,user:', uo,  app_client.sender, app_client.on_update)
    tx = app_client.update()
