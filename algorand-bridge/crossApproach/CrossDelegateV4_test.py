import os
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
# old_app_id = 1001


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
    ttt = app_client.call(
        CrossDelegateV4.smgRelease,
        uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=bytes.fromhex('a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337'),
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        boxes=[(app_client.app_id, smgID)], # Must append app_id and box key for tx
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
            creator = accts.pop()
            self.acct_addr = creator.address
            self.acct_signer = creator.signer
            self.private_key = creator.private_key
            app_client = beaker.client.ApplicationClient(
                client=beaker.localnet.get_algod_client(), 
                app=CrossDelegateV4.app,
                signer=creator.signer,
            )
            algod_client = app_client.client
            self.app_client = app_client
            self.algod_client = algod_client
            print(f"localnet Address: {creator.address}")



def main() -> None:
    prov = Provider(IsTestnet)
    print("prov:", prov.acct_addr)

    algod_client = prov.algod_client
    app_client = prov.app_client
    acct_addr = prov.acct_addr
    acct_signer = prov.acct_signer
    acct_private_key = prov.private_key

    print("Creating app")
    app_client.create()
    # app_client.update()
    print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)

    atc = AtomicTransactionComposer()
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct_addr, sp_with_fees, app_client.app_addr, 300001),
            signer=acct_signer,
        )
    )

    atc = app_client.add_method_call(
        atc,
        CrossDelegateV4.initialize,
        owner=acct_addr,
        admin=acct_addr,
        oracle_id=1,
        token_manager_id=2,
    )
    result = atc.execute(algod_client, 3)

    ################ oracle #######################
    test_oracle(app_client)
    
    

    # #token pair fee
    # app_client.call(
    #     CrossDelegateV4.setTokenPairFee,
    #     tokenPairID=666,
    #     contractFee=2153201998,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    # )

    # balance_before_get = app_client.client.account_info(acct_addr)
    # print("balance_before_get:", balance_before_get['amount'])
    # fee = app_client.call(
    #     CrossDelegateV4.getTokenPairFee,
    #     tokenPairID=666,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))],
    #     suggested_params=sp
    # )
    # print("fee:", fee.return_value)
    # balance_after_get = app_client.client.account_info(acct_addr)
    # print("balance_after_get:", balance_after_get['amount'])
    


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
    
    
    app_client.call(
        CrossDelegateV4.create_wrapped_token,
        name= "aaa",
        symbol= "aaa",
        decimals= 8,
        total_supply= 0x6fffffffffffffff,
    )
    # info2 = app_client.client.account_info(app_client.app_addr)
    # print("info 3:", info2)
    info2 = app_client.call(
        CrossDelegateV4.get_latest_wrapped_token_id,
    )
    print("get_latest_wrapped_token_id:", info2.return_value)
    assetID = info2.return_value

    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
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



if __name__ == "__main__":
    main()





