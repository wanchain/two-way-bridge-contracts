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

old_app_id = 0  #updateApplication approval program too long. max len 4096 bytes
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
AssetID = 0
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')




@pytest.mark.smgRelease
def test_smgRelease(app_client, app_client_admin,setStoreman,user) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')

    r,s = get_sign(chainAlgo, uniqueID, 33, 55, 1, 0, decode_address("7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY") )

    tx = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=r,s=s,
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        accounts = [app_client_admin.sender, user.address],
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("------------------smgRelease:", tx.return_value, tx.tx_info)

@pytest.mark.smgRelease
def test_smgRelease_noFee(app_client, app_client_admin, setStoreman) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')
    r,s = get_sign(chainAlgo, uniqueID, 33, 55, 0, 0, decode_address("7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY") )

    tx = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=0, tokenAccount=0,
        r=r,s=s,
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        accounts = [app_client_admin.sender],
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("------------------smgRelease:", tx.return_value, tx.tx_info)


# token
@pytest.mark.smgRelease
def test_tokensmgRelease(app_client, app_client_admin,setStoreman, mintedAssetID, admin) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')


    aitx = AssetOptInTxn(
        admin.address,
        sp_big_fee,
        mintedAssetID,
    )
    
    aitx = aitx.sign(admin.signer.private_key)
    txid = beaker.localnet.get_algod_client().send_transaction(aitx)
    transaction.wait_for_confirmation(app_client_admin.client, txid, 1)

    info = app_client.client.asset_info(mintedAssetID)
    print("xxxxyyyyyyyyyyyy:", info)
    info = app_client.client.account_info(app_client_admin.sender)
    print("xxxxyyyyyyyyyyyy account_info:", info)

    info = app_client.client.account_info(app_client.app_addr)
    print("xzzzzzzzzzzzz account_info:", info)

    r,s = get_sign(chainAlgo, uniqueID, 33, 55, 0, mintedAssetID, decode_address(admin.address) )

    print("xxxxxxxxxxxxxxxxxx:", app_client.app_addr)
    ttt = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=0, tokenAccount=mintedAssetID,
        r=r,s=s,
        userAccount=admin.address,
        suggested_params = sp_big_fee,
        accounts = [app_client.sender, admin.address],
        foreign_assets=[mintedAssetID],
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("mmmmmmmmmmmmmm------------------smgRelease:", ttt.return_value, ttt.tx_info)


@pytest.mark.smgRelease
def test_tokensmgRelease_fee(app_client, app_client_admin,setStoreman, mintedAssetID, admin, user) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')

    aitx = AssetOptInTxn(
        admin.address,
        sp_big_fee,
        mintedAssetID,
    )
    aitx = aitx.sign(admin.signer.private_key)
    txid = beaker.localnet.get_algod_client().send_transaction(aitx)
    transaction.wait_for_confirmation(app_client.client, txid, 1)
    aitx = AssetOptInTxn(
        user.address,
        sp_big_fee,
        mintedAssetID,
    )

    aitx = aitx.sign(user.signer.private_key)
    txid = beaker.localnet.get_algod_client().send_transaction(aitx)
    transaction.wait_for_confirmation(app_client.client, txid, 1)


    info = app_client.client.asset_info(mintedAssetID)
    print("xxxxyyyyyyyyyyyy:", info)
    info = app_client.client.account_info(app_client_admin.sender)
    print("xxxxyyyyyyyyyyyy account_info:", info)

    info = app_client.client.account_info(app_client.app_addr)
    print("xzzzzzzzzzzzz account_info:", info)


    print("xxxxxxxxxxxxxxxxxx:", app_client.app_addr)
    r,s = get_sign(chainAlgo, uniqueID, 33, 55, 148, mintedAssetID, decode_address(admin.address) )

    ttt = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=148, tokenAccount=mintedAssetID,
        r=r,s=s,
        userAccount=admin.address,
        suggested_params = sp_big_fee,
        accounts = [app_client.sender, admin.address, user.address],
        foreign_assets=[mintedAssetID],
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("mmmmmmmmmmmmmm------------------smgRelease:", ttt.return_value, ttt.tx_info)

