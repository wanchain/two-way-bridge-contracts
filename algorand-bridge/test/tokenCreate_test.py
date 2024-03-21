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


def test_tokenCreate(prov):
    print('create demo asset token')
    sp_with_fees = prov.app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    ctxn = AssetCreateTxn(
        prov.acct_addr,
        sp_with_fees,
        total=100000000000000,
        default_frozen=False,
        unit_name="MOCK",
        asset_name="MOCK TOKEN",
        manager="",
        reserve=prov.app_client.app_addr,
        freeze="",
        clawback="",
        url="https://bridge.wanchain.org",
        decimals=6,
    )
    tx = prov.acct_signer.sign_transactions([ctxn], [0])
    txid = prov.algod_client.send_transaction(tx[0])
    print('txid', txid)
    receipt = transaction.wait_for_confirmation(prov.algod_client, txid)
    print('receipt', receipt['asset-index'])
    asset_id = receipt['asset-index']

    # optIn test asset
    print("optIn test asset")
    prov.app_client.fund(200000) # deposit for minimum balance require
    prov.app_client.call(
        bridge.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
    )
    print('done')
    return asset_id

def main() -> None:
    prov = Provider(False)
    prov.create()

    test_tokenCreate(prov)



if __name__ == "__main__":
    main()





