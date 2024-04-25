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

# @pytest.mark.store
# @pytest.mark.xfail(True, run=True, reason='too long')
# def test_storex(app_client, feeProxyAddr):
#     tx = app_client.call(
#         bridge.store1,
#         a=bytes(2043),
#     )

# @pytest.mark.store
# def test_store(app_client, feeProxyAddr):
#     tx = app_client.call(
#         bridge.store1,
#         a=bytes(2042),
#     )

# @pytest.mark.store
# def test_store2(app_client, feeProxyAddr):
#     tx = app_client.call(
#         bridge.store2,
#         a=bytes(1021),
#         b=bytes(1019),
#     )

# @pytest.mark.store
# def test_store3(app_client, feeProxyAddr):
#     tx = app_client.call(
#         bridge.store3,
#         a=bytes(118), # max is 118
#     )
#     v = app_client.call(
#         bridge.getStore3,
#     )
#     print("v:", v.return_value)

@pytest.mark.store
def test_store4(app_client, feeProxyAddr):
    tx = app_client.call(
        bridge.store4,
        a=33445,
        b=bytes(1022),
        boxes=[(app_client.app_id,33445)]
    )




