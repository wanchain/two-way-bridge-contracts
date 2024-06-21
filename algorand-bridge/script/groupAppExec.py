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
import groupApprove
import bridge
from utils import *


IsTestnet = True
smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')

bridge_app_id = 627255629 
old_app_id = 679847880
chainAlgo =  2147483931

def test_groupApproveExec(gpapp_client):
    sp_big_fee = gpapp_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20    

    taskCount = 10  # set the taskID
    r,s = get_gpsign(taskCount,chainAlgo)
    tx = gpapp_client.call(
        groupApprove.approveAndExecute,
        proposalId=taskCount,
        smgID=smgID, 
        r=r, s=s,
        foreign_apps=[bridge_app_id],
        suggested_params = sp_big_fee,
        boxes = [
            (gpapp_client.app_id, getPrefixKey("mapTask", taskCount)),
            (bridge_app_id, smgID),
        ]
    )
    print("tx:", tx.tx_info)



def main() -> None:
    prov = Provider(IsTestnet)
    print("deployer:", prov.acct_addr)

    prov.connect(old_app_id, groupApprove.app)

    test_groupApproveExec(prov.app_client)
    return



if __name__ == "__main__":
    main()





