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

import CrossDelegateV4
IsTestnet = False
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
old_app_id = 0
tokenPairId666 = 666
tokenPairId888 = 888

def tokenPairIdBoxKey(id):
    tokenPairIdLength=math.ceil(((id).bit_length())/8)
    return id.to_bytes(tokenPairIdLength, 'big')






def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        if box_name == b"pair_list":
            print(bytes.hex(contents))
        else:
            print(f"\t{box_name} => {contents} ")
def test_userLock(app_client, acct_addr, aacct_signer) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 300000),
            signer=aacct_signer,
        )
    )
    
    atc = app_client.add_method_call(
        atc,
        CrossDelegateV4.userLock,
        smgID=smgID,
        tokenPairID=33, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=55, 
    )

    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print("---------------------- txUserLock:", rv.return_value)
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
        CrossDelegateV4.userBurn,
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
        CrossDelegateV4.smgMint,
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
        CrossDelegateV4.smgRelease,
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
        CrossDelegateV4.set_storeman_group_config,
        id=smgID,
        startTime=1799351111,
        endTime=1799351331,
        gpk=bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5'),
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        suggested_params = sp,
    )
    print("------------------set_storeman_group_config:", ttt.return_value, ttt.tx_info)

    tx = app_client.call(
        CrossDelegateV4.get_smg_info,
        id=smgID,
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        suggested_params = sp,
    )
    print("------------------get_smg_info:", tx.return_value)

    tx = app_client.call(
        CrossDelegateV4.acquireReadySmgInfoTest,
        smgID=smgID,
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
        # ss=33,
        suggested_params = sp,
    )
    print("------------------acquireReadySmgInfoTest:", tx.return_value)
    



class Provider:
    def __init__(self,isTesn):
        if(isTesn):
            mn = "cost piano sample enough south bar diet garden nasty mystery mesh sadness convince bacon best patch surround protect drum actress entire vacuum begin abandon hair"
            pk = mnemonic.to_private_key(mn)
            acctAddr = account.address_from_private_key(pk)
            print(f"testnet Address: {acctAddr}")
            signer = AccountTransactionSigner(pk)
            algod_client = v2client.algod.AlgodClient('b7e384d0317b8050ce45900a94a1931e28540e1f69b2d242b424659c341b4697','https://testnet-api.algonode.cloud')

            app_client = beaker.client.ApplicationClient(
                algod_client, CrossDelegateV4.app, signer=signer
            )
            self.acct_signer = signer
            self.acct_addr = acctAddr
            self.app_client = app_client
            self.algod_client = algod_client
            self.private_key = pk
        else:
            accts = beaker.localnet.get_accounts()
            owner = accts.pop()
            admin = accts.pop()
            self.acct_addr = owner.address
            self.acct_signer = owner.signer
            self.private_key = owner.private_key
            self.owner = owner
            self.admin = admin
            if(old_app_id == 0):
                print("000")
                app_client = beaker.client.ApplicationClient(
                    client=beaker.localnet.get_algod_client(), 
                    app=CrossDelegateV4.app,
                    signer=owner.signer,
                )
            else:
                print("111")
                app_client = beaker.client.ApplicationClient(
                    client=beaker.localnet.get_algod_client(), 
                    app=CrossDelegateV4.app,
                    app_id=old_app_id,
                    signer=owner.signer,
                )
            algod_client = app_client.client
            self.app_client = app_client
            self.algod_client = algod_client
            print(f"localnet Address: {owner.address}")



def main() -> None:
    prov = Provider(IsTestnet)
    print("prov:", prov.acct_addr)

    algod_client = prov.algod_client
    app_client = prov.app_client
    acct_addr = prov.acct_addr
    acct_signer = prov.acct_signer
    acct_private_key = prov.private_key

    if old_app_id == 0:
        print("Creating app")
        app_client.create()
        app_client2 = app_client.prepare(signer=prov.admin.signer)
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
                txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 600000),
                signer=acct_signer,
            )
        )
        atc = app_client.add_method_call(
            atc,
            CrossDelegateV4.initialize,
            owner=prov.owner.address,
            admin=prov.admin.address,
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
        CrossDelegateV4.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=2153201998,
        boxes=[(app_client.app_id, tokenPairIdBoxKey(tokenPairId666))]
    )

    # balance_before_get = app_client.client.account_info(acct_addr)
    # print("balance_before_get:", balance_before_get['amount'])
    fee = app_client.call(
        CrossDelegateV4.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id, tokenPairIdBoxKey(tokenPairId666))],
        suggested_params=sp
    )
    print("fee:", fee.return_value)

    app_client.call(
        CrossDelegateV4.setTokenPairFees,
        tokenPairID=[tokenPairId666,tokenPairId888],
        contractFee=[2153201998,9999999],
        boxes=[
            (app_client.app_id, tokenPairIdBoxKey(tokenPairId666)),
            (app_client.app_id, tokenPairIdBoxKey(tokenPairId888))
        ]
    )
    
    sp.fee += 1
    fee = app_client.call(
        CrossDelegateV4.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id, tokenPairIdBoxKey(tokenPairId666))],
        suggested_params=sp
    )
    print("fee 6 :", fee.return_value)
    sp.fee += 1
    fee = app_client.call(
        CrossDelegateV4.getTokenPairFee,
        tokenPairID=tokenPairId888,
        boxes=[(app_client.app_id, tokenPairIdBoxKey(tokenPairId888))],
        suggested_params=sp
    )
    print("fee 8:", fee.return_value)
    return
    # #currentChainID
    # app_client.call(
    #     CrossDelegateV4.setChainID,
    #     chainID=2153201998,
    # )

    # fee = app_client.call(
    #     CrossDelegateV4.currentChainID,
    # )
    # print("fee:", fee.return_value)

    # #admin
    # app_client.call(
    #     CrossDelegateV4.setAdmin,
    #     adminAccount="TZZPM7LO6SVB632S7AWTCXABGEM2WHC4UEFPN46S57JHY6XRTUU6BBUWEI",
    # )

    # adminAccount = app_client.call(
    #     CrossDelegateV4.admin,
    # )
    # print("adminAccount:", adminAccount.return_value)

    # testGetInfo = app_client.call(
    #     CrossDelegateV4.testGet,
    # )
    # print("testGetInfo:", testGetInfo.return_value)

    #userLock
    test_userLock(app_client, acct_addr, acct_signer)
    
    
    test_smgRelease(app_client)
    
    
    tx = app_client.call(
        CrossDelegateV4.create_wrapped_token,
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


    test_smgMint(app_client, acct_addr, assetID) 

    
    test_userBurn(app_client, acct_addr, acct_signer, assetID)



    # Test add_token_pair
    print("Adding token pair")

    app_client.call(
        CrossDelegateV4.add_token_pair,
        id=tokenPairId666,
        from_chain_id=2153201998,
        from_account="0x0000000000000000000000000000000000000000",
        to_chain_id=2147483931, # algorand
        to_account=str(assetID),
        boxes=[
            (app_client.app_id,tokenPairIdBoxKey), 
            (app_client.app_id, "pair_list")
        ]
    )
    
    print('get token pair')
    pair = app_client.call(
        CrossDelegateV4.get_token_pair,
        id=tokenPairId666,
        boxes=[(app_client.app_id, tokenPairIdBoxKey)]
    )
    print("pair.return_value:", pair.return_value)
    assert pair.return_value[2] == '0x0000000000000000000000000000000000000000'
    

    # Should not be able to add_token_pair for same pair Id again
    try:
        app_client.call(
            CrossDelegateV4.add_token_pair,
            id=tokenPairId666,
            from_chain_id=2153201998,
            from_account="0x0000000000000000000000000000000000000000",
            to_chain_id=2147483931, # algorand
            to_account=str(assetID),
            boxes=[
                (app_client.app_id,tokenPairIdBoxKey), 
                (app_client.app_id, "pair_list")
            ]
        )
    except Exception as e:
        print('pass')
    
    print_boxes(app_client)

    print('update token pair')
    app_client.call(
        CrossDelegateV4.update_token_pair,
        id=666,
        from_chain_id=2153201998,
        from_account="0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB",
        to_chain_id=2147483931, # algorand
        to_account=str(assetID),
        boxes=[(app_client.app_id, tokenPairIdBoxKey)]
    )

    print('get token pair')
    pair = app_client.call(
        CrossDelegateV4.get_token_pair,
        id=666,
        boxes=[(app_client.app_id, tokenPairIdBoxKey)]
    )

    assert pair.return_value[2] == '0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB'

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

    asset_id = tokenId.return_value
    print("mint wrapped token", asset_id)
    
    aitx = AssetOptInTxn(
        owner.address,
        sp,
        asset_id,
    )
    
    aitx = aitx.sign(owner.signer.private_key)
    txid = beaker.localnet.get_algod_client().send_transaction(aitx)
    
    admin_client.call(
        token_manager.mint_wrapped_token,
        asset_id=asset_id,
        amount=1000,
        to=owner.address,
        foreign_assets=[asset_id],
        accounts=[owner.address],
    )
    
    account_info = beaker.localnet.get_algod_client().account_info(owner.address)
    
    asset_balance = 0
    if 'assets' in account_info:
        for asset in account_info['assets']:
            if asset['asset-id'] == asset_id:
                asset_balance = asset['amount']
                break
    
    print('balance', asset_balance)
    assert asset_balance == 1000

    print('burn wrapped token', asset_id)
    admin_client.call(
        token_manager.burn_wrapped_token,
        asset_id=asset_id,
        amount=1000,
        holder=owner.address,
        foreign_assets=[asset_id],
        accounts=[owner.address],
    )

    account_info = beaker.localnet.get_algod_client().account_info(owner.address)
    
    asset_balance = 0
    if 'assets' in account_info:
        for asset in account_info['assets']:
            if asset['asset-id'] == asset_id:
                asset_balance = asset['amount']
                break
    
    print('balance', asset_balance)
    assert asset_balance == 0

    print('done')

if __name__ == "__main__":
    main()





