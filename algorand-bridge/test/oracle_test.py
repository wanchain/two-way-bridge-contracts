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

# IsTestnet = False
# old_app_id = 0

IsTestnet = True
old_app_id = 575450697

def test_oracle(app_client) -> None:
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo +10
    smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303632')

    ttt = app_client.call(
        bridge.set_storeman_group_config,
        id=smgID,
        startTime=1709956800,
        endTime=1712635200,
        gpk=bytes.fromhex('764cf4df0b78f7d15433d927981c7467aae494bb4946d996890024a5ea8d0df61a6cd7ba9c6d6e356957de6a8d936c13a19787f26b0926c913b82d31a206e887'),
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        suggested_params = sp,
    )
    print("------------------set_storeman_group_config:", ttt.return_value, ttt.tx_info)

    tx = app_client.call(
        bridge.get_smg_info,
        id=smgID,
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        suggested_params = sp,
    )
    print("------------------get_smg_info:", tx.return_value)

    tx = app_client.call(
        bridge.acquireReadySmgInfoTest,
        smgID=smgID,
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        # ss=33,
        suggested_params = sp,
    )
    print("------------------acquireReadySmgInfoTest:", tx.return_value)
    




def main() -> None:
    prov = Provider(IsTestnet, old_app_id)
    print("prov:", prov.acct_addr)

    algod_client = prov.algod_client
    app_client = prov.app_client
    acct_addr = prov.acct_addr
    acct_signer = prov.acct_signer
    acct_private_key = prov.private_key

    if old_app_id == 0:
        print("Creating app")
        app_client.create()

        atc = AtomicTransactionComposer()
        sp_with_fees = algod_client.suggested_params()
        sp_with_fees.flat_fee = True
        sp_with_fees.fee = beaker.consts.milli_algo



        atc.add_transaction(
            TransactionWithSigner(
                txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 9000000),
                signer=acct_signer,
            )
        )
        atc = app_client.add_method_call(
            atc,
            bridge.initialize,
            owner=prov.owner.address,
            admin=prov.admin.address,
            boxes=[(app_client.app_id, "pair_list")] * 8,
        )
        result = atc.execute(algod_client, 3)
        print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)



    

    test_oracle(app_client)

    print('done')

if __name__ == "__main__":
    main()





