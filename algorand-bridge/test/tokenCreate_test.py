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

@pytest.mark.tokenCreate
def test_tokenCreate(app_client, app_client_admin, owner):
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

    # optIn test asset
    print("optIn test asset")
    app_client.fund(200000) # deposit for minimum balance require
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
        boxes=[
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender)),
        ]
    )
    print('asset_id:', asset_id)







