import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn
from algosdk import account, transaction

import beaker

import cross


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
        beaker.localnet.get_algod_client(), cross.app, signer=creator.signer
    )

    print("Creating app")
    app_client.create()
    print("Create success")

    owner_client = app_client.prepare(signer=owner.signer)
    admin_client = app_client.prepare(signer=admin.signer)
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    
    # Pay for minimum balance
    ptxn = PaymentTxn(
        creator.address,
        sp,
        app_client.app_addr,
        300000,
    )
    
    app_client.call(
        cross.initialize,
        seed=TransactionWithSigner(ptxn, creator.signer),
        owner=owner.address,
        admin=admin.address,
        oracle_id=1,
        token_manager_id=2,
    )


    # Should not be able to initialize again
    try:
        app_client.call(
            cross.initialize,
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
        cross.setTokenPairFee,
        tokenPairID=666,
        contractFee=2153201998,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )

    fee = app_client.call(
        cross.getTokenPairFee,
        tokenPairID=666,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )
    print("fee:", fee.return_value)

    #currentChainID
    app_client.call(
        cross.setChainID,
        chainID=2153201998,
    )

    fee = app_client.call(
        cross.currentChainID,
    )
    print("fee:", fee.return_value)

    #admin
    app_client.call(
        cross.setAdmin,
        adminAccount="TZZPM7LO6SVB632S7AWTCXABGEM2WHC4UEFPN46S57JHY6XRTUU6BBUWEI",
    )

    adminAccount = app_client.call(
        cross.admin,
    )
    print("adminAccount:", adminAccount.return_value)

    

if __name__ == "__main__":
    main()