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


def test_oracle(app_client) -> None:
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo +10

    smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303632')
    ttt = app_client.call(
        bridge.set_storeman_group_config,
        id=smgID,
        startTime=1709956800,
        endTime=1712635200,
        gpk=bytes.fromhex('764cf4df0b78f7d15433d927981c7467aae494bb4946d996890024a5ea8d0df61a6cd7ba9c6d6e356957de6a8d936c13a19787f26b0926c913b82d31a206e887'),
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        suggested_params = sp,
    )

    # smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
    # ttt = app_client.call( # old
    #     bridge.set_storeman_group_config,
    #     id=smgID,
    #     startTime=1799351111,
    #     endTime=1799351331,
    #     gpk=bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5'),
    #     boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
    #     suggested_params = sp,
    # )


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
    prov = Provider(False)
    prov.create()
    # prov.update(prov.app_client.app_id)

    test_oracle(prov.app_client)

    print('done')

if __name__ == "__main__":
    main()





