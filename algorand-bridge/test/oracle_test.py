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
import pytest





@pytest.mark.Author
@pytest.mark.xfail(True, run=True, reason='not admin')
def test_oracle_setStoremanGroupConfig_notAdmin(app_client) -> None:
    smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
    GPK = bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5')
    startTime = 1799351111
    endTime = 1799351331
    status = 5
    # app_client.signer = admin.signer
    app_client.call(
        bridge.setStoremanGroupConfig,
        id=smgID,
        status=status,
        startTime=startTime,
        endTime=endTime,
        gpk=GPK,
        boxes=[
            (app_client.app_id, smgID),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.get_sender())),
        ],
    )



@pytest.mark.oracle
def test_oracle(app_client_admin) -> None:

    smgID = bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')
    GPK = bytes.fromhex('8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5')
    startTime = 1799351111
    endTime = 1799351331
    status = 5
    # app_client.signer = admin.signer
    app_client_admin.call(
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


    # info = app_client.call(
    #     bridge.getStoremanGroupConfig,
    #     id=smgID,
    #     boxes=[(app_client.app_id, smgID)],
    # )
    # assert bytes(info.return_value[0]) == GPK
    # assert info.return_value[1] == startTime
    # assert info.return_value[2] == endTime
    # assert info.return_value[3] == status

    # status = 7
    # app_client.call(
    #     bridge.setStoremanGroupStatus,
    #     id=smgID,
    #     status=status,
    #     boxes=[(app_client.app_id, smgID)],
    # )
    # info = app_client.call(
    #     bridge.getStoremanGroupConfig,
    #     id=smgID,
    #     boxes=[(app_client.app_id, smgID)],
    # )
    # assert bytes(info.return_value[0]) == GPK
    # assert info.return_value[1] == startTime
    # assert info.return_value[2] == endTime
    # assert info.return_value[3] == status    


    # authorization test
    