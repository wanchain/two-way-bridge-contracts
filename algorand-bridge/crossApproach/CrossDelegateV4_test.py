import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn,AssetTransferTxn
from algosdk import account, transaction,logic

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

def main() -> None:
    accts = beaker.localnet.get_accounts()
    creator = accts.pop()
    owner = accts.pop()
    admin = accts.pop()

    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), CrossDelegateV4.app, signer=creator.signer
    )

    print("creator info:", creator.address, decode_address(creator.address).hex())
    
    print("Creating app")
    app_client.create()
    print("Create success")
    print("app_client.app_id:", app_client.app_id)
    app_addr = logic.get_application_address(app_client.app_id)
    print("app_addr:", app_addr)

    owner_client = app_client.prepare(signer=owner.signer)
    admin_client = app_client.prepare(signer=admin.signer)
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000

    sp_no_fee = app_client.get_suggested_params()
    sp_no_fee.flat_fee = True
    sp_no_fee.fee = 0

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = 12000
    
    # Pay for minimum balance
    ptxn = PaymentTxn(
        creator.address,
        sp,
        app_client.app_addr,
        300000,
    )
    
    app_client.call(
        CrossDelegateV4.initialize,
        seed=TransactionWithSigner(ptxn, creator.signer),
        owner=owner.address,
        admin=admin.address,
        oracle_id=1,
        token_manager_id=2,
    )


    # Should not be able to initialize again
    try:
        app_client.call(
            CrossDelegateV4.initialize,
            seed=TransactionWithSigner(ptxn, creator.signer),
            owner=owner.address,
            admin=admin.address,
            oracle_id=1,
            token_manager_id=2,
        )
    except Exception as e:
        print('pass')

    print("done")

    #token pair fee
    app_client.call(
        CrossDelegateV4.setTokenPairFee,
        tokenPairID=666,
        contractFee=2153201998,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )

    balance_before_get = app_client.client.account_info(creator.address)
    print("balance_before_get:", balance_before_get['amount'])
    fee = app_client.call(
        CrossDelegateV4.getTokenPairFee,
        tokenPairID=666,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))],
        suggested_params=sp
    )
    print("fee:", fee.return_value)
    balance_after_get = app_client.client.account_info(creator.address)
    print("balance_after_get:", balance_after_get['amount'])
    


    #currentChainID
    app_client.call(
        CrossDelegateV4.setChainID,
        chainID=2153201998,
    )

    fee = app_client.call(
        CrossDelegateV4.currentChainID,
    )
    print("fee:", fee.return_value)

    #admin
    app_client.call(
        CrossDelegateV4.setAdmin,
        adminAccount="TZZPM7LO6SVB632S7AWTCXABGEM2WHC4UEFPN46S57JHY6XRTUU6BBUWEI",
    )

    adminAccount = app_client.call(
        CrossDelegateV4.admin,
    )
    print("adminAccount:", adminAccount.return_value)

    testGetInfo = app_client.call(
        CrossDelegateV4.testGet,
    )
    print("testGetInfo:", testGetInfo.return_value)

    #userLock
    ptxn = PaymentTxn(
        creator.address,
        sp,
        app_client.app_addr,
        300000,
    )
    txUserLock = app_client.call(
        CrossDelegateV4.userLock,
        seed=TransactionWithSigner(ptxn, creator.signer),
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, 
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
    )
    print("---------------------- txUserLock:", txUserLock.tx_info, txUserLock.return_value)
    return
    # info = app_client.client.account_info(app_client.app_addr)
    # print("info1 :", info)

    ttt = app_client.call(
        CrossDelegateV4.smgRelease,
        uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=bytes.fromhex('d0063d8bf8360f65595969ca47b011495328d56403e918c4492a0930e9af3776000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('5a5ae6a5e0df90de840fab44dbbef26398ae0d0aa3eaff3501d713c4cbeeb25b'),
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        foreign_apps=[3709],
    )
    print("------------------smgRelease:", ttt.return_value, ttt.tx_info)
    info2 = app_client.client.account_info(app_client.app_addr)
    print("info 2:", info2.get('amount'))


    app_client.call(
        CrossDelegateV4.create_wrapped_token,
        name= "aaa",
        symbol= "aaa",
        decimals= 8,
        total_supply= 99999999333444555,
    )
    # info2 = app_client.client.account_info(app_client.app_addr)
    # print("info 3:", info2)
    info2 = app_client.call(
        CrossDelegateV4.get_latest_wrapped_token_id,
    )
    print("get_latest_wrapped_token_id:", info2.return_value)
    assetID = info2.return_value

    optin_txn = transaction.AssetOptInTxn(
        sender=admin.address, sp=sp, index=assetID
    )
    signed_optin_txn = optin_txn.sign(admin.private_key)

    txid = app_client.client.send_transaction(signed_optin_txn)
    print(f"Sent opt in transaction with txid: {txid}")

    # Wait for the transaction to be confirmed
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)

    app_client.call(
        CrossDelegateV4.smgMint,
        uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, 
        fee=1, 
        tokenAccount=assetID,
        userAccount= admin.address,
        r=bytes.fromhex('a1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105000000000000000000000000000000000000000000000000000000000000001b'), 
        s=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6'),
        foreign_assets=[assetID],
        accounts=[admin.address],
    )
    # info2 = app_client.client.account_info(admin.address)
    # print("info 4:", info2)
    
    ptxn = AssetTransferTxn(
        admin.address,
        sp,
        app_client.app_addr,
        55,assetID,
    )
    txUserBurn = app_client.call(
        CrossDelegateV4.userBurn,
        seed=TransactionWithSigner(ptxn, admin.signer),
        smgID=bytes.fromhex('000000000000000000000000000000000000000000000041726965735f303338'), 
        tokenPairID=33, value=55, fee=55,
        tokenAccount=assetID,
        userAccount= admin.address,
        foreign_assets=[assetID],
        accounts=[admin.address],
    )
    print("txUserBurn:", txUserBurn.tx_info, txUserBurn.return_value)
    # info2 = app_client.client.account_info(admin.address)
    # print("after uer burn -------------------info:", info2)
    # info2 = app_client.client.account_info(app_client.app_addr)
    # print("info 5:", info2)
    
if __name__ == "__main__":
    main()