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
        client=algod_client, app=CrossDelegateV4.app, app_id=575450697, signer=creator
    )

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
    assetID = 575450876
    tx5 = app_client.call(
        CrossDelegateV4.smgMint,
        uniqueID='aa',
        smgID="smg", tokenPairID=33, value=25, fee=55,
        tokenAccount=assetID,
        userAccount= acctAddr,
        r="r", s = "s",
        foreign_assets=[assetID],
        accounts=[acctAddr],
    )
    print("tx5:", tx5.tx_info)

    

    
if __name__ == "__main__":
    main()
