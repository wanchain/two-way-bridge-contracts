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
old_app_id = 0  #updateApplication approval program too long. max len 4096 bytes
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838


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
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')
    ttt = app_client.call(
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
    print("------------------smgRelease:", ttt.return_value, ttt.tx_info)

def test_oracle(app_client) -> None:
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo 

    ttt = app_client.call(
        bridge.set_storeman_group_config,
        id=smgID,
        startTime=1799351111,
        endTime=1799351331,
        gpk=bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5'),
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
        app_client2 = app_client.prepare(signer=acct_signer)
        try:
            app_client2.update()
            assert False
        except Exception as e:
            print('pass')

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
            owner=acct_addr,
            admin=acct_addr,
            boxes=[(app_client.app_id, "pair_list")] * 8,
        )
        result = atc.execute(algod_client, 3)
        print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)

    else:
        app_client.update()

    ################ oracle #######################
    test_oracle(app_client)
    
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo

    # #token pair fee
    app_client.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=1111,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
   )
    
    # balance_before_get = app_client.client.account_info(acct_addr)
    # print("balance_before_get:", balance_before_get['amount'])
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
    )
    print("fee:", fee.return_value)
    
    app_client.call(
        bridge.setTokenPairFees,
        tokenPairID=[tokenPairId666,tokenPairId888],
        contractFee=[1111,9999999],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId888))
        ]
    )
    
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
    )
    print("fee 6 :", fee.return_value)
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId888,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId888))],
        suggested_params=sp
    )
    print("fee 8:", fee.return_value)
     

    app_client.call(
        bridge.setFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,
        contractFee=222,
        agentFee=444,
        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo))
        ],
        suggested_params=sp
    )
    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo))
        ],
        suggested_params=sp
    )
    print("fee 6 :", fee.return_value)

    app_client.call(
        bridge.setFees,
        srcChainID=[chainBase,chainAlgo],
        destChainID=[chainMaticZk,chainMaticZk],
        contractFee=[222, 333],
        agentFee=[444, 555],
        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee",    chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainMaticZk)),
        ],
        suggested_params=sp
    )
    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainBase,
        destChainID=chainMaticZk,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainMaticZk))
        ],
        suggested_params=sp
    )
    print("fee 6-9 :", fee.return_value)
    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainAlgo,
        destChainID=chainMaticZk,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainMaticZk))
        ],
        suggested_params=sp
    )
    print("fee 8-9 :", fee.return_value)    

    
    # #admin
    # app_client.call(
    #     bridge.setAdmin,
    #     adminAccount="TZZPM7LO6SVB632S7AWTCXABGEM2WHC4UEFPN46S57JHY6XRTUU6BBUWEI",
    # )

    # adminAccount = app_client.call(
    #     bridge.admin,
    # )
    # print("adminAccount:", adminAccount.return_value)

    # testGetInfo = app_client.call(
    #     bridge.testGet,
    # )
    # print("testGetInfo:", testGetInfo.return_value)

    
    tx = app_client.call(
        bridge.create_wrapped_token,
        name= "aaa",
        symbol= "aaa",
        decimals= 8,
        total_supply= 0x6fffffffffffffff,
    )
    print("create_wrapped_token: ", tx.return_value)
    assetID = tx.return_value


    


    optin_txn = transaction.AssetOptInTxn(
        sender=acct_addr, sp=sp, index=assetID
    )
    signed_optin_txn = optin_txn.sign(acct_private_key)

    txid = app_client.client.send_transaction(signed_optin_txn)
    print(f"Sent opt in transaction with txid: {txid}")

    # Wait for the transaction to be confirmed
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)



    # Test add_token_pair
    print("Adding token pair")

    app_client.call(
        bridge.add_token_pair,
        id=tokenPairId666,
        from_chain_id=chainBase,
        from_account="0x0000000000000000000000000000000000000000",
        to_chain_id=chainAlgo, # algorand
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
    app_client.call(bridge.setSmgFeeProxy,proxy=acct_addr,suggested_params=sp)

    #userLock
    test_userLock(app_client, acct_addr, acct_signer)
    return
    
    test_smgRelease(app_client)
    



    test_smgMint(app_client, acct_addr, assetID) 

    
    test_userBurn(app_client, acct_addr, acct_signer, assetID)



    print_boxes(app_client)
    return
    print('create demo asset token')

    ctxn = AssetCreateTxn(
        owner.address,
        sp,
        total=100000000000000,
        default_frozen=False,
        unit_name="MOCK",
        asset_name="MOCK TOKEN",
        manager=creator.address,
        reserve=creator.address,
        freeze=creator.address,
        clawback=creator.address,
        url="https://bridge.wanchain.org",
        decimals=6,
    )
    tx = owner.signer.sign_transactions([ctxn], [0])
    txid = beaker.localnet.get_algod_client().send_transaction(tx[0])
    print('txid', txid)
    receipt = transaction.wait_for_confirmation(beaker.localnet.get_algod_client(), txid)
    print('receipt', receipt['asset-index'])
    asset_id = receipt['asset-index']

    # optIn test asset
    print("optIn test asset")
    app_client.fund(200000) # deposit for minimum balance require
    owner_client.call(
        token_manager.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
    )


    print('done')

if __name__ == "__main__":
    main()





