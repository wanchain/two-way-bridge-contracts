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
old_app_id = 627255629



def test_smgRelease(app_client) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('3260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')
    smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303632')

    ttt = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=bytes.fromhex('96d21ff6c85c8fe2b35263cd87e7e8cfc2fea1e15e9169815c42c10510a10232000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('6e90148c7c9fda60edaeb2bfb4de6334220961307808933d76e1eab147f83f28'),
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("------------------smgRelease:", ttt.return_value, ttt.tx_info)



def main() -> None:
    prov = Provider(IsTestnet)
    prov.connect(old_app_id)

    test_smgRelease(prov.app_client)

    print('done')

if __name__ == "__main__":
    main()





