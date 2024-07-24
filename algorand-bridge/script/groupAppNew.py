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

bridge_app_id = 627255629  #updateApplication approval program too long. max len 4096 bytes
old_app_id = 677348256

chainAlgo =  2147483931

# create a new groupApprove, transfer bridge owner to it.


@pytest.mark.groupApproveTransferOwner
def test_groupApproveTransferOwner(gpapp_client, app_client, newAddr):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 22
    stateAll = gpapp_client.get_global_state()
    taskCount = stateAll.get('taskCount')
    print("taskCount:", taskCount)

    codec = ABIType.from_string("(address)")
    encoded = codec.encode([newAddr])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=3,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    codec = ABIType.from_string(str(groupApprove.Task().type_spec())) 
    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codec.decode(binfo)
    print("task:", task)

    r,s = get_gpsign(taskCount,chainAlgo)
    tx = gpapp_client.call(
        groupApprove.approveAndExecute,
        proposalId=taskCount,
        smgID=smgID, 
        r=r, s=s,
        foreign_apps=[app_client.app_id],
        suggested_params = sp_big_fee,
        boxes = [
            (gpapp_client.app_id, getPrefixKey("mapTask", taskCount)),
            (app_client.app_id, smgID),
       ]
    )
    print("tx:", tx.tx_info)

    stateAll = app_client.get_global_state()
    value1 = stateAll.get('owner')
    ownerAddr = encode_address(bytes.fromhex(value1))
    assert ownerAddr == newAddr




def main() -> None:
    prov = Provider(IsTestnet)
    print("deployer:", prov.acct_addr)
    
    prov.createGroupApprove(bridge_app_id)
    print("new groupApprove:", prov.app_client.app_id)


    # transfer owner to groupApprove SC
    provBridge = Provider(IsTestnet)
    provBridge.connect(bridge_app_id, bridge.app)
    provOldGP = Provider(IsTestnet)
    provOldGP.connect(old_app_id, groupApprove.app)




    test_groupApproveTransferOwner(provOldGP.app_client, provBridge.app_client, prov.app_client.app_addr)
    return



if __name__ == "__main__":
    main()





