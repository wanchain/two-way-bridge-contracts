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
from oracle_test import test_oracle
from feeProxy_test import test_feeProxy
from fee_test import test_fee
from tokenPair_test import test_tokenPair
import pytest

smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
old_app_id = 0  #updateApplication approval program too long. max len 4096 bytes
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
AssetID = 0
algoCoinId = 0
smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303632')


@pytest.mark.userLock
def test_userLock_nofee(app_client, app_client_admin, nativeAssetID,user) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=0,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556),
    )
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)



@pytest.mark.userLock
def test_userLock_fee(app_client, app_client_admin, nativeAssetID,user) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=123,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556+123),
    )
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)




@pytest.mark.userLock
@pytest.mark.xfail
def test_userLock_fee_moreCoin(app_client, app_client_admin, nativeAssetID,user) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=123,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556+123+345), #value+fee+more
    )
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)


#token

@pytest.mark.userLock
def test_userLock_token_nofee(app_client, app_client_admin, nativeAssetID,user) -> None:
    sp_with_fees = app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6
    
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=nativeAssetID,
        foreign_assets=[nativeAssetID],
        suggested_params=sp_with_fees,
        boxes = [(app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))]
    )

    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees


    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=0,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=nativeAssetID.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 0),
    )
    atc = app_client.add_transaction(
        atc,
        txn=AssetTransferTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556, nativeAssetID),
    )    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)



@pytest.mark.userLock
def test_userLock_token_fee(app_client, app_client_admin, nativeAssetID,user) -> None:
    sp_with_fees = app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6
    
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=nativeAssetID,
        foreign_assets=[nativeAssetID],
        suggested_params=sp_with_fees,
        boxes = [(app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))]
    )

    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=123,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=nativeAssetID.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 123),
    )
    atc = app_client.add_transaction(
        atc,
        txn=AssetTransferTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556, nativeAssetID),
    )    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)




@pytest.mark.userLock
@pytest.mark.xfail
def test_userLock_token_fee_moreToken(app_client, app_client_admin, nativeAssetID,user) -> None:
    sp_with_fees = app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6
    
    app_client_admin.call(
        bridge.opt_in_token_id,
        id=nativeAssetID,
        foreign_assets=[nativeAssetID],
        suggested_params=sp_with_fees,
        boxes = [(app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))]
    )
    
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=123,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ],
        suggested_params=sp_with_fees
    )

    app_client.call(
        bridge.addTokenPair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=nativeAssetID.to_bytes(8, 'big'),
        to_chain_id=chainBase, # algorand
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(app_client.sender, sp_with_fees, app_client.app_addr, 123),
    )
    atc = app_client.add_transaction(
        atc,
        txn=AssetTransferTxn(app_client.sender, sp_with_fees, app_client.app_addr, 556+1, nativeAssetID),
    )   
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        accounts = [user.address],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)


