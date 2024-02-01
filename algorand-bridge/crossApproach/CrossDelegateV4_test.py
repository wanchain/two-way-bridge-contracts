import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn,AssetTransferTxn
from algosdk import account, transaction,logic
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    LogicSigTransactionSigner,
    TransactionWithSigner,
)
import beaker

import CrossDelegateV4


def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        if box_name == b"pair_list":
            print(bytes.hex(contents))
        else:
            print(f"\t{box_name} => {contents} ")
def test_userLock(app_client, admin) -> None:
    algod_client = app_client.client
    atc = AtomicTransactionComposer()    

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(admin.address, sp_with_fees, app_client.app_addr, 300000),
            signer=admin.signer,
        )
    )
    
    atc = app_client.add_method_call(
        atc,
        CrossDelegateV4.userLock,
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, 
        userAccount="0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6",
        value=55, 
    )

    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print("---------------------- txUserLock:", rv.return_value)
def test_userBurn(app_client, admin, assetID) -> None:
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
                admin.address,
                sp,
                app_client.app_addr,
                55,assetID,
            ),
            signer=admin.signer,
        )
    )

    atc = app_client.add_method_call(
        atc,
        CrossDelegateV4.userBurn,
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, fee=55,
        tokenAccount=assetID,
        userAccount= admin.address,
        foreign_assets=[assetID],
        accounts=[admin.address],
    )

    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print("---------------------- txUserLock:", rv.return_value)


def test_smgMint(app_client, admin, assetID) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    tx = app_client.call(
        CrossDelegateV4.smgMint,
        uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, 
        fee=1, 
        tokenAccount=assetID,
        userAccount=admin.address,
        r=bytes.fromhex('a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337'),
        foreign_assets=[assetID],
        accounts=[admin.address],
        suggested_params = sp_big_fee,
    )
    print("------------------smgMint:", tx.return_value, tx.tx_info)


def test_smgRelease(app_client) -> None:
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    smgID = bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338')
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

def test_oracle(app_client, admin) -> None:
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo 
    smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338')

    ttt = app_client.call(
        CrossDelegateV4.set_storeman_group_config,
        id=smgID,
        # gpk="abc",
        gpk=bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5'),

        startTime=1699351331,
        endTime=1799351331,
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
    print("------------------get_smg_info:", tx.return_value, tx.tx_info)


def main() -> None:
    accts = beaker.localnet.get_accounts()
    creator = accts.pop()
    owner = accts.pop()
    admin = accts.pop()

    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), CrossDelegateV4.app, signer=creator.signer
    )
    algod_client = app_client.client

    print("creator info:", creator.address, decode_address(creator.address).hex())
    
    print("Creating app")
    app_client.create()
    print("Create success")
    print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)

    # owner_client = app_client.prepare(signer=owner.signer)
    # admin_client = app_client.prepare(signer=admin.signer)
    
    print("Configing app")


    sp_no_fee = app_client.get_suggested_params()
    sp_no_fee.flat_fee = True
    sp_no_fee.fee = 0

    

    atc = AtomicTransactionComposer()

    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(creator.address, sp_with_fees, app_client.app_addr, 300001),
            signer=creator.signer,
        )
    )
    

    atc = app_client.add_method_call(
        atc,
        CrossDelegateV4.initialize,
        owner=creator.address,
        admin=creator.address,
        oracle_id=1,
        token_manager_id=2,
    )

    result = atc.execute(algod_client, 3)

    ################ oracle #######################
    test_oracle(app_client, admin)

    

    # #token pair fee
    # app_client.call(
    #     CrossDelegateV4.setTokenPairFee,
    #     tokenPairID=666,
    #     contractFee=2153201998,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    # )

    # balance_before_get = app_client.client.account_info(creator.address)
    # print("balance_before_get:", balance_before_get['amount'])
    # fee = app_client.call(
    #     CrossDelegateV4.getTokenPairFee,
    #     tokenPairID=666,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))],
    #     suggested_params=sp
    # )
    # print("fee:", fee.return_value)
    # balance_after_get = app_client.client.account_info(creator.address)
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
    test_userLock(app_client, admin)

    

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
        sender=admin.address, sp=sp, index=assetID
    )
    signed_optin_txn = optin_txn.sign(admin.private_key)

    txid = app_client.client.send_transaction(signed_optin_txn)
    print(f"Sent opt in transaction with txid: {txid}")

    # Wait for the transaction to be confirmed
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)


    test_smgMint(app_client, admin, assetID) 

    
    test_userBurn(app_client, admin, assetID)



if __name__ == "__main__":
    main()





