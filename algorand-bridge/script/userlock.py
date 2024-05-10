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


IsTestnet = True
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
old_app_id = 627255629  #updateApplication approval program too long. max len 4096 bytes
AssetID = 627255785       # this is minted by wanchain.
nativeAssetID = 640706823 # this is a native token, need cross to wanchain.
nativeAssetIDHex = bytes.fromhex('26306907')
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
algoCoinId = 0

def test_userLock(app_client, acct_addr, aacct_signer) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6


    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 1666),
    )
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=1000, 
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            # (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainBase)),
            # (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            # (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)




def test_userLockToken(app_client, acct_addr, aacct_signer) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 888),
    ) 
    atc = app_client.add_transaction(
        atc,
        txn=AssetTransferTxn(acct_addr, sp_with_fees, app_client.app_addr, 2000, nativeAssetID),
    )
   
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId888, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=2000, 
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId888)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId888)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+0)),
            # (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainBase)),
            # (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            # (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("userLockToken:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- userLockToken txid:", rv)
    for rv in result.abi_results:
        print("---------------------- userLockToken txresult:", rv.return_value, rv.tx_id, rv.tx_info)


def setOracle(app_client) -> None:
    adminKey = getPrefixAddrKey("mapAdmin", app_client.sender)
    tx = app_client.call(bridge.addAdmin,adminAccount=app_client.sender,boxes=[
            (app_client.app_id, adminKey),
        ] )
    transaction.wait_for_confirmation(app_client.client, tx.tx_id, 1)
    tx = app_client.call(bridge.setSmgFeeProxy,proxy=app_client.sender)
    transaction.wait_for_confirmation(app_client.client, tx.tx_id, 1)
    GPK = bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5')
    startTime = 1799351111
    endTime = 1799351331
    status = 5
    tx = app_client.call(
        bridge.setStoremanGroupConfig,
        id=smgID,
        status=status,
        startTime=startTime,
        endTime=endTime,
        gpk=GPK,
        boxes=[
            (app_client.app_id, smgID),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.get_sender())),
        ],
    )
    transaction.wait_for_confirmation(app_client.client, tx.tx_id, 1)


def test_smgRelease(app_client) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')

    tx = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=bytes.fromhex('a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337'),
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("------------------smgRelease:", tx.return_value, tx.tx_info)


def tokenCreate(prov):
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
        reserve=prov.acct_addr,
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

def setStoreman(app_client) -> None:
    global smgID
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo +10

    app_client.call(
        bridge.set_storeman_group_config,
        id=smgID,
        startTime=1712635200,
        endTime=1715227200,
        gpk=bytes.fromhex('66e0c512ba81ea67dce73a0a886fe703e5c5c277f9dea6819827c579930852ea728d863858b50bebf3e67f37fc1eb9e8c87af1fe34a8963fd9c9c6965c3e3009'),
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
    )
def setFeeProxy(app_client, feeProxyAddr):
    app_client.call(
        bridge.setSmgFeeProxy,
        proxy=feeProxyAddr,
    )

def updateTokenPair(app_client, assetID):
    app_client.call(
        bridge.update_token_pair,
        id=tokenPairId666,
        from_chain_id=chainAlgo,
        from_account=algoCoinId.to_bytes(8, 'big'),
        to_chain_id=chainBase,
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
        ]
    )

    app_client.call(
        bridge.update_token_pair,
        id=tokenPairId888,
        from_chain_id=chainAlgo,
        from_account=nativeAssetID.to_bytes(8, 'big'),
        to_chain_id=chainBase,
        to_account=bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB"),
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId888)),
        ]
    )

def setFee(app_client):
    app_client.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=666,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
    )
    app_client.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId888,
        contractFee=888,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId888))],
    )    






def main() -> None:
    global AssetID
    prov = Provider(IsTestnet)
    print("deployer:", prov.acct_addr)
    

    if old_app_id == 0:
        prov.create()
    else:
        prov.update(old_app_id)

    algod_client = prov.algod_client
    app_client = prov.app_client

    sp_with_fees = app_client.client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    ################ oracle #######################
    # setStoreman(app_client)
    
    # setFeeProxy(app_client, prov.acct_addr)
 
    # setFee(app_client)

    # tokenCreate(prov)
    # updateTokenPair(app_client, AssetID)
    test_userLock(app_client, prov.acct_addr, prov.acct_signer)
    test_userLockToken(app_client, prov.acct_addr, prov.acct_signer)

    setOracle(app_client)
    test_smgRelease(app_client)
    return




if __name__ == "__main__":
    main()





