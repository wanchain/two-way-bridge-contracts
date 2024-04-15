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

tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
algoCoinId = 0
 
@pytest.mark.tokenPair
def test_tokenPair(app_client, nativeAssetID):
    print("Adding token pair")

    app_client.call(
        bridge.add_token_pair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account=bytes.fromhex("0000000000000000000000000000000000000000"),
        to_chain_id=chainAlgo,
        to_account=nativeAssetID.to_bytes(8, 'big'),
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
    print("pair.return_value[2]:", bytes(pair.return_value[2]) )
    assert bytes(pair.return_value[2]) == bytes.fromhex("0000000000000000000000000000000000000000")
    

    # Should not be able to add_token_pair for same pair Id again
    try:
        app_client.call(
            bridge.add_token_pair,
            id=tokenPairId666,
            from_chain_id=chainBase,
            from_account=bytes.fromhex("0000000000000000000000000000000000000000"),
            to_chain_id=chainAlgo, # algorand
            to_account=algoCoinId.to_bytes(8, 'big'),
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
        from_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        to_chain_id=chainAlgo, # algorand
        to_account=algoCoinId.to_bytes(8, 'big'),
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
    assert bytes(pair.return_value[2]) == bytes.fromhex('a4E62375593662E8fF92fAd0bA7FcAD25051EbCB')
    
    app_client.call(
        bridge.update_token_pair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )





