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


def getPrefixKey(prefix, id):
    value = bytes(prefix, 'utf8')+id.to_bytes(8, "big")
    length_to_encode = len(value).to_bytes(2, byteorder="big")
    return length_to_encode + value

def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        if box_name == b"pair_list":
            print(bytes.hex(contents))
        else:
            print(f"\t{box_name} => {contents} ")


class Provider:
    def __init__(self,isTesn=False, old_app_id=0):
        if(isTesn):
            # private_key, address = account.generate_account()
            # print(f"private key: {private_key}")
            # print(f"mnemonic: {mnemonic.from_private_key(private_key)}")

            mn = "art light glove rather reopen kick dose scrub okay weapon custom focus symptom build fresh runway you know pelican caution enter identify ginger ability coil"
            pk = mnemonic.to_private_key(mn)
            acctAddr = account.address_from_private_key(pk)
            print(f"testnet Address: {acctAddr}")
            signer = AccountTransactionSigner(pk)
            algod_client = v2client.algod.AlgodClient('b7e384d0317b8050ce45900a94a1931e28540e1f69b2d242b424659c341b4697','https://testnet-api.algonode.cloud')

            # app_client = beaker.client.ApplicationClient(
            #     algod_client, bridge.app, signer=signer
            # )
            if(old_app_id == 0):
                app_client = beaker.client.ApplicationClient(
                    client=algod_client,
                    app=bridge.app,
                    signer=signer,
                )
            else:
                app_client = beaker.client.ApplicationClient(
                    client=algod_client,
                    app=bridge.app,
                    app_id=old_app_id,
                    signer=signer,
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
                app_client = beaker.client.ApplicationClient(
                    client=beaker.localnet.get_algod_client(), 
                    app=bridge.app,
                    signer=owner.signer,
                )
            else:
                app_client = beaker.client.ApplicationClient(
                    client=beaker.localnet.get_algod_client(), 
                    app=bridge.app,
                    app_id=old_app_id,
                    signer=owner.signer,
                )
            algod_client = app_client.client
            self.app_client = app_client
            self.algod_client = algod_client
            print(f"localnet Address: {owner.address}")





