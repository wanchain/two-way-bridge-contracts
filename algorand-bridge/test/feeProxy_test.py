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



def main() -> None:
    prov = Provider(False)

    algod_client = prov.algod_client
    app_client = prov.app_client
    acct_addr = prov.acct_addr
    acct_signer = prov.acct_signer
    acct_private_key = prov.private_key

    print("Creating app")
    app_client.create()


    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo

    # set fee proxy
    tx = app_client.call(
        bridge.setSmgFeeProxy,
        proxy=acct_addr,
        suggested_params=sp
    )
    print("setSmgFeeProxy tx:", tx.return_value, tx)

    feeproxy = app_client.call(
        bridge.getSmgFeeProxy,
        suggested_params=sp
    )
    print("getSmgFeeProxy feeproxy:", feeproxy.return_value)


if __name__ == "__main__":
    main()





