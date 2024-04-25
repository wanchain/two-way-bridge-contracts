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
from oracle_test import test_oracle
from feeProxy_test import test_feeProxy
from fee_test import test_fee
from tokenPair_test import test_tokenPair
import pytest

old_app_id = 0  #updateApplication approval program too long. max len 4096 bytes
tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838
AssetID = 0
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')


def setOracle(app_client_admin) -> None:
    app_client_admin.call(bridge.setSmgFeeProxy,proxy=app_client_admin.sender)
    GPK = bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5')
    startTime = 1799351111
    endTime = 1799351331
    status = 5
    tx = app_client_admin.call(
        bridge.setStoremanGroupConfig,
        id=smgID,
        status=status,
        startTime=startTime,
        endTime=endTime,
        gpk=GPK,
        boxes=[
            (app_client_admin.app_id, smgID),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.get_sender())),
        ],
    )
    transaction.wait_for_confirmation(app_client_admin.client, tx.tx_id, 1)
    info =  app_client_admin.call(
        bridge.getStoremanGroupConfig,
        id=smgID,
        boxes=[
            (app_client_admin.app_id, smgID),
        ],
    )
    print("getStoremanGroupConfig:", info.return_value)



@pytest.mark.smgRelease
def test_smgRelease(app_client, app_client_admin) -> None:
    setOracle(app_client_admin)

    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    uniqueID=bytes.fromhex('8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6')

    ttt = app_client.call(
        bridge.smgRelease,
        uniqueID=uniqueID,
        smgID=smgID, 
        tokenPairID=33, value=55, 
        fee=1, tokenAccount=0,
        r=bytes.fromhex('a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84000000000000000000000000000000000000000000000000000000000000001c'), 
        s=bytes.fromhex('c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337'),
        userAccount="7LTVKXWHLGFI4FP6YCACSS4DPSZ6IQBHJXRYX53QVQRXDTGIK6KSU4J7ZY",
        suggested_params = sp_big_fee,
        accounts = [app_client_admin.sender],
        boxes=[(app_client.app_id, smgID), (app_client.app_id, uniqueID)], # Must append app_id and box key for tx
    )
    print("------------------smgRelease:", ttt.return_value, ttt.tx_info)





