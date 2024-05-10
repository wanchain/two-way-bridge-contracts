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

@pytest.mark.feeProxy
@pytest.mark.xfail
def test_feeProxy_notowner(app_client_admin, feeProxyAddr):
    tx = app_client_admin.call(
        bridge.setSmgFeeProxy,
        proxy=feeProxyAddr,
    )


@pytest.mark.feeProxy
def test_feeProxy(app_client, feeProxyAddr):
    tx = app_client.call(
        bridge.setSmgFeeProxy,
        proxy=feeProxyAddr,
    )
    fpv = getApplicationGlobal(app_client, 'feeProxy')
    print("fpv:", fpv)
    assert fpv == feeProxyAddr






