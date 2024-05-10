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

@pytest.mark.optIn
@pytest.mark.xfail
def test_optIn_notAdmin(app_client, nativeAssetID, owner):
    app_client.call(
        bridge.opt_in_token_id,
        id=nativeAssetID,
        foreign_assets=[nativeAssetID],
        boxes = [(app_client.app_id, getPrefixAddrKey("mapAdmin", owner.address))]
    )
    print('done')


@pytest.mark.optIn
def test_optIn_Admin(app_client_admin, nativeAssetID, admin):
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=nativeAssetID,
        foreign_assets=[nativeAssetID],
        boxes = [(app_client_admin.app_id, getPrefixAddrKey("mapAdmin", admin.address))]
    )
    print('done')

