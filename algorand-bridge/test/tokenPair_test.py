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

tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838

def test_tokenPair(app_client, assetID):
    print("Adding token pair")

    app_client.call(
        bridge.add_token_pair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account="0x0000000000000000000000000000000000000000",
        to_chain_id=chainAlgo,
        to_account=str(assetID),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, "pair_list")
        ]
    )
    
    print('get token pair')
    pair = app_client.call(
        bridge.get_token_pair,
        id=tokenPairId666,
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )
    print("pair.return_value:", pair.return_value)
    assert pair.return_value[2] == '0x0000000000000000000000000000000000000000'
    

    # Should not be able to add_token_pair for same pair Id again
    try:
        app_client.call(
            bridge.add_token_pair,
            id=tokenPairId666,
            from_chain_id=chainBase,
            from_account="0x0000000000000000000000000000000000000000",
            to_chain_id=chainAlgo, # algorand
            to_account=str(0),
            boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
                (app_client.app_id, "pair_list")
            ]
        )
    except Exception as e:
        print('pass')
    

    print('update token pair')
    app_client.call(
        bridge.update_token_pair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account="0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB",
        to_chain_id=chainAlgo, # algorand
        to_account=str(0),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )

    print('get token pair')
    pair = app_client.call(
        bridge.get_token_pair,
        id=666,
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )

    print("pair.return_value:", pair.return_value)
    assert pair.return_value[2] == '0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB'
    


def main() -> None:
    prov = Provider(False)
    prov.create()

    test_tokenPair(prov.app_client)



if __name__ == "__main__":
    main()





