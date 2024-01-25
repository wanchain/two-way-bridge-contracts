import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner, AccountTransactionSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn,AssetTransferTxn
from algosdk import account, transaction,logic, util, mnemonic, v2client

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
    mn = "cost piano sample enough south bar diet garden nasty mystery mesh sadness convince bacon best patch surround protect drum actress entire vacuum begin abandon hair"
    pk = mnemonic.to_private_key(mn)
    print(f"Base64 encoded private key: {pk}")
    acctAddr = account.address_from_private_key(pk)
    print(f"Address: {acctAddr}")
    creator = AccountTransactionSigner(pk)

    algod_client = v2client.algod.AlgodClient('b7e384d0317b8050ce45900a94a1931e28540e1f69b2d242b424659c341b4697','https://testnet-api.algonode.cloud')
    print("1")

    app_client = beaker.client.ApplicationClient(
        algod_client, CrossDelegateV4.app, signer=creator
    )

    print("Creating app")
    app_client.create()
    print("Create success")
    print("app_client.app_id:", app_client.app_id)
    app_addr = logic.get_application_address(app_client.app_id)
    print("app_addr:", app_addr)
    
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    
    # Pay for minimum balance
    ptxn = PaymentTxn(
        acctAddr,
        sp,
        app_client.app_addr,
        300000,
    )
    
    app_client.call(
        CrossDelegateV4.initialize,
        seed=TransactionWithSigner(ptxn, creator),
        owner=acctAddr,
        admin=acctAddr,
        oracle_id=1,
        token_manager_id=2,
    )


    # Should not be able to initialize again
    try:
        app_client.call(
            CrossDelegateV4.initialize,
            seed=TransactionWithSigner(ptxn, creator),
            owner=acctAddr,
            admin=acctAddr,
            oracle_id=1,
            token_manager_id=2,
        )
    except Exception as e:
        print('pass')

    print("done")

    # #token pair fee
    # app_client.call(
    #     CrossDelegateV4.setTokenPairFee,
    #     tokenPairID=666,
    #     contractFee=2153201998,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    # )

    # fee = app_client.call(
    #     CrossDelegateV4.getTokenPairFee,
    #     tokenPairID=666,
    #     boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    # )
    # print("fee:", fee.return_value)

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
    ptxn = PaymentTxn(
        acctAddr,
        sp,
        app_client.app_addr,
        300000,
    )
    txUserLock = app_client.call(
        CrossDelegateV4.userLock,
        seed=TransactionWithSigner(ptxn, creator),
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
        sender=acctAddr, sp=sp, index=assetID
    )
    signed_optin_txn = optin_txn.sign(pk)

    txid = app_client.client.send_transaction(signed_optin_txn)
    print(f"Sent opt in transaction with txid: {txid}")

    # Wait for the transaction to be confirmed
    results = transaction.wait_for_confirmation(app_client.client, txid, 4)

    app_client.call(
        CrossDelegateV4.smgMint,
        uniqueID='aa',
        smgID="smg", tokenPairID=33, value=55, fee=55,
        tokenAccount=assetID,
        userAccount= acctAddr,
        r="r", s = "s",
        foreign_assets=[assetID],
        accounts=[acctAddr],
    )
    info2 = app_client.client.account_info(acctAddr)
    print("info 4:", info2)
    


    ptxn = AssetTransferTxn(
        acctAddr,
        sp,
        app_client.app_addr,
        55,assetID,
    )
    app_client.call(
        CrossDelegateV4.userBurn,
        seed=TransactionWithSigner(ptxn, creator),
        smgID="smg", tokenPairID=33, value=55, fee=55,
        tokenAccount=assetID,
        userAccount= acctAddr,
        foreign_assets=[assetID],
        accounts=[acctAddr],
    )
    info2 = app_client.client.account_info(acctAddr)
    print("after uer burn -------------------info:", info2)
    info2 = app_client.client.account_info(app_client.app_addr)
    print("info 5:", info2)
    
if __name__ == "__main__":
    main()
