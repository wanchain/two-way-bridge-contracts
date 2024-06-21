import os
import math
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner, AccountTransactionSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn,AssetTransferTxn
from algosdk import account, transaction,logic, util, mnemonic, v2client, abi
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    LogicSigTransactionSigner,
    TransactionWithSigner,
)
import beaker
import base64
import bridge
from Crypto.Hash import keccak
from secp256k1 import PrivateKey, PublicKey


def getPrefixKey(prefix, id):
    value = bytes(prefix, 'utf8')+id.to_bytes(8, "big")
    length_to_encode = len(value).to_bytes(2, byteorder="big")
    return length_to_encode + value

def getPrefixAddrKey(prefix, addr):
    value = bytes(prefix, 'utf8')+decode_address(addr)
    length_to_encode = len(value).to_bytes(2, byteorder="big")
    return length_to_encode + value

def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        print(f"\t{box_name} => {contents} ")

def hash(data):
    keccak_hash = keccak.new(digest_bits=256)
    keccak_hash.update(data)
    hash = keccak_hash.digest()
    print("hash:", hash.hex())
    return hash

def get_sign(CurrentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount):
    alldata = CurrentChainID.to_bytes(8, "big")+ \
        uniqueID+ \
        tokenPairID.to_bytes(8, "big")+ \
        value.to_bytes(8, "big")+ \
        fee.to_bytes(8, "big")+ \
        tokenAccount.to_bytes(8, "big")+ \
        userAccount
    print("alldata:", alldata.hex())
    m = hash(alldata)
    return schnorr_sign(m)

def get_gpsign(proposalId, CurrentChainID):
    codec = abi.ABIType.from_string("(uint64,uint64)")
    alldata = codec.encode([proposalId, CurrentChainID])
    print("alldata:", alldata.hex())
    m = hash(alldata)
    return schnorr_sign(m)    

# def schnorr_challenge(R, Ru, m, publicKey):
#     # R is compressed pubkey for an reandom K
#     # m is message hash
#     # publieKey is the signer's compressed Pubkey

def schnorr_sign(m):
    x = '16eea2f8dea9469e22fd75cd227ff4b81a34c14afc69b92636a88b38f1ac2a3c'
    k = x
    privx = PrivateKey(bytes(bytearray.fromhex(x)), raw=True)
    publicKey = privx.pubkey.serialize(compressed=True)
    print("publicKey:", publicKey.hex())

    privk = PrivateKey(bytes(bytearray.fromhex(k)), raw=True)
    R = privk.pubkey.serialize(compressed=True)
    print("R:", R.hex())
    RU = privk.pubkey.serialize(compressed=False)
    print("RU:", RU.hex())

    Raddr = hash(RU[1:])[12:]
    print("Raddr:", Raddr.hex())

    eall = Raddr+(R[0]-2+27).to_bytes(1,'big')+R[1:]+m
    print("eall:", eall.hex())
    e = hash(eall)
    print("e:", e.hex())
    xe = privx.tweak_mul(e)
    print("xe:", xe.hex())

    s = privk.tweak_add(xe)
    print("s:", s.hex())

    if(publicKey[0] == 2):
        r=e+bytes.fromhex('000000000000000000000000000000000000000000000000000000000000001b')
    else:
        r=e+bytes.fromhex('000000000000000000000000000000000000000000000000000000000000001c')
    print("r:", r.hex())
    return r,s


class Provider:
    def __init__(self,isTesn=False):
        if(isTesn):
            # private_key, address = account.generate_account()
            # print(f"private key: {private_key}")
            # print(f"mnemonic: {mnemonic.from_private_key(private_key)}")

            mn = "art light glove rather reopen kick dose scrub okay weapon custom focus symptom build fresh runway you know pelican caution enter identify ginger ability coil"
            pk = mnemonic.to_private_key(mn)
            acctAddr = account.address_from_private_key(pk)
            signer = AccountTransactionSigner(pk)
            algod_client = v2client.algod.AlgodClient('b7e384d0317b8050ce45900a94a1931e28540e1f69b2d242b424659c341b4697','https://testnet-api.algonode.cloud')

          
            self.acct_addr = acctAddr
            self.acct_signer = signer
            self.private_key = pk

            self.algod_client = algod_client
            print(f"testnet Address: {acctAddr}")
        else:
            accts = beaker.localnet.get_accounts()
            owner = accts.pop()
            admin = accts.pop()
            self.acct_addr = owner.address
            self.acct_signer = owner.signer
            self.private_key = owner.private_key

            self.algod_client = beaker.localnet.get_algod_client()
            print(f"localnet Address: {owner.address}")


    def create(self):
        print("Creating app")
        app_client = beaker.client.ApplicationClient(
            client=self.algod_client,
            app=bridge.app,
            signer=self.acct_signer,
        )        
        app_client.create()

        atc = AtomicTransactionComposer()
        sp_with_fees = self.algod_client.suggested_params()
        sp_with_fees.flat_fee = True
        sp_with_fees.fee = beaker.consts.milli_algo

        atc.add_transaction(
            TransactionWithSigner(
                txn=PaymentTxn(self.acct_addr, sp_with_fees, app_client.app_addr, 2000000),
                signer=self.acct_signer,
            )
        )
        atc = app_client.add_method_call(
            atc,
            bridge.initialize,
            owner=self.acct_addr,
            admin=self.acct_addr,
            updateOwner=owner.address,
            feeProxy=self.acct_addr,
            boxes=[
                (app_client.app_id, getPrefixAddrKey("mapAdmin", self.acct_addr)),
            ],
        )
        result = atc.execute(self.algod_client, 3)
        self.app_client = app_client
        print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)      

    def update(self,old_app_id):
        app_client = beaker.client.ApplicationClient(
            client=self.algod_client,
            app=bridge.app,
            app_id=old_app_id,
            signer=self.acct_signer,
        )  
        app_client.update()
        self.app_client = app_client
        print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)      

    def connect(self,old_app_id):
        app_client = beaker.client.ApplicationClient(
            client=self.algod_client,
            app=bridge.app,
            app_id=old_app_id,
            signer=self.acct_signer,
        )  
        self.app_client = app_client
        print("app_client app_id,app_addr:", app_client.app_id, app_client.app_addr)     

