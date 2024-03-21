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


def test_feeProxy(app_client, feeProxyAddr):
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo

    # set fee proxy
    tx = app_client.call(
        bridge.setSmgFeeProxy,
        proxy=feeProxyAddr,
        suggested_params=sp
    )
    print("setSmgFeeProxy tx:", tx.return_value, tx)

    feeproxy = app_client.call(
        bridge.getSmgFeeProxy,
        suggested_params=sp
    )
    print("getSmgFeeProxy feeproxy:", feeproxy.return_value)


def main() -> None:
    prov = Provider(False)
    prov.create()

    feeProxyAddr = prov.acct_addr
    test_feeProxy(prov.app_client, feeProxyAddr)



if __name__ == "__main__":
    main()





