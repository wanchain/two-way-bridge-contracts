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
from tokenCreate_test import test_tokenCreate
from tokenPair_test import test_tokenPair

IsTestnet = False
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
old_app_id = 0  #updateApplication approval program too long. max len 4096 bytes
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
AssetID = 0

def test_userLock(app_client, acct_addr, aacct_signer) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    atc = app_client.add_transaction(
        atc,
        txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 300000),
    )
    
    atc = app_client.add_method_call(
        atc,
        bridge.userLock,
        smgID=smgID,
        tokenPairID=tokenPairId666, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=556, 
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainBase)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo)),
        ]
    )

    result = app_client.execute_atc(atc)
    print("txUserLock:", result, len(result.tx_ids))
    for rv in result.tx_ids:
        print("---------------------- txUserLock txid:", rv)
    for rv in result.abi_results:
        print("---------------------- txUserLock txresult:", rv.return_value, rv.tx_id, rv.tx_info)


def test_userBurn(app_client, acct_addr, acct_signer,assetID) -> None:
    algod_client = app_client.client
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    
    atc = AtomicTransactionComposer()
    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    atc.add_transaction(
        TransactionWithSigner(
            txn=AssetTransferTxn(
                acct_addr,
                sp,
                app_client.app_addr,
                55,assetID,
            ),
            signer=acct_signer,
        )
    )

    atc = app_client.add_method_call(
        atc,
        bridge.userBurn,
        smgID=smgID,
        tokenPairID=33, value=55, fee=55,
        tokenAccount=assetID,
        userAccount= acct_addr,
        foreign_assets=[assetID],
        accounts=[acct_addr],
    )

    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print("---------------------- txUserLock:", rv.return_value)


def test_smgMint(app_client, acct_addr, assetID) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    tx = app_client.call(
        bridge.smgMint,
        uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        smgID=smgID,
        tokenPairID=33, value=55, 
        fee=1, 
        tokenAccount=assetID,
        userAccount=acct_addr,
        r=bytes.fromhex('a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337'),
        foreign_assets=[assetID],
        accounts=[acct_addr],
        suggested_params = sp_big_fee,
    )
    print("------------------smgMint:", tx.return_value, tx.tx_info)


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
    test_oracle(app_client)
    test_feeProxy(app_client, prov.acct_addr)
    test_fee(app_client)
    if AssetID == 0:
        AssetID = test_tokenCreate(prov)
    
    # #admin
    # app_client.call(
    #     bridge.setAdmin,
    #     adminAccount="TZZPM7LO6SVB632S7AWTCXABGEM2WHC4UEFPN46S57JHY6XRTUU6BBUWEI",
    # )

    # adminAccount = app_client.call(
    #     bridge.admin,
    # )
    # print("adminAccount:", adminAccount.return_value)


    
  


    optin_txn = transaction.AssetOptInTxn(
        sender=prov.acct_addr, sp=sp_with_fees, index=AssetID
    )
    signed_optin_txn = optin_txn.sign(prov.private_key)

    txid = app_client.client.send_transaction(signed_optin_txn)
    print(f"Sent opt in transaction with txid: {txid}")

    # Wait for the transaction to be confirmed
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)
    app_client.call(bridge.setSmgFeeProxy,proxy=prov.acct_addr,suggested_params=sp_with_fees)

    test_tokenPair(app_client, AssetID)
    #userLock
    test_userLock(app_client, prov.acct_addr, prov.acct_signer)
    
    test_smgRelease(app_client)
    return




    test_smgMint(app_client, acct_addr, assetID) 
    test_userBurn(app_client, acct_addr, acct_signer, assetID)



    print_boxes(app_client)
    return


if __name__ == "__main__":
    main()





