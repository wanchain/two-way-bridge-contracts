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
@pytest.mark.app
def test_delete(app_client):
    tx = app_client.delete()

@pytest.mark.xfail(True, run=True, reason='not admin')
@pytest.mark.app
def test_updateAdmin(app_client_admin):
    tx = app_client_admin.update()

@pytest.mark.app
def test_updateOwner(app_client):
    tx = app_client.update()



