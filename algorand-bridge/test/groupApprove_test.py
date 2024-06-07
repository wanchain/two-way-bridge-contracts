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
from utils import *
import pytest


chainAlgo =  2147483931

smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631')

# @pytest.mark.groupApproveAdmin
# def test_groupApproveAdmin2(gpapp_client, app_client,setStoreman):
#     tx = gpapp_client.call(
#         groupApprove.TTTT,
#         smgID=smgID,
#         foreign_apps=[app_client.app_id],
#         boxes = [
#             (app_client.app_id, smgID),
#         ]
#     )
#     print("TTTtttttttttttttttttttttttttttttT:", tx.return_value)




@pytest.mark.groupApproveAdmin
def test_groupApproveAdmin(gpapp_client, app_client, owner,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20

    # add
    taskCount=0
    print("owner:", owner.address, decode_address(owner.address))
    print("appp ID:", app_client.app_id, gpapp_client.app_id)

    # transfer owner to groupApprove
    tx = app_client.call(
        bridge.transferOwner,
        _newOwner=gpapp_client.app_addr
    )
    print("tx:", tx.tx_info)

    codec = ABIType.from_string("(address)")
    encoded = codec.encode([owner.address])


    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=1,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    codec = ABIType.from_string(str(groupApprove.Task().type_spec())) 
    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codec.decode(binfo)
    print("task:", task)
    adminKey = getPrefixAddrKey("mapAdmin", owner.address)
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
            (app_client.app_id, getPrefixAddrKey("mapAdmin", owner.address)),    
        ]
    )
    print("tx:", tx.tx_info)

    adminKey = getPrefixAddrKey("mapAdmin", owner.address)
    allBox = app_client.get_box_names()
    print("allBox:", allBox)
    assert adminKey in allBox

    adminv = app_client.get_box_contents(adminKey)
    assert int.from_bytes(adminv,'big') == 1



    # remove
    taskCount = taskCount + 1
    codec = ABIType.from_string("(address)")
    encoded = codec.encode([owner.address])


    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=2,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    codec = ABIType.from_string(str(groupApprove.Task().type_spec())) 
    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codec.decode(binfo)
    print("task:", task)
    adminKey = getPrefixAddrKey("mapAdmin", owner.address)
    
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
            (app_client.app_id, getPrefixAddrKey("mapAdmin", owner.address)),    
        ]
    )
    print("tx:", tx.tx_info)

    adminKey = getPrefixAddrKey("mapAdmin", owner.address)
    allBox = app_client.get_box_names()
    print("allBox:", allBox)
    assert not adminKey in allBox


@pytest.mark.groupApproveSetHalt
def test_groupApproveSetHalt(gpapp_client, app_client, owner,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    taskCount=0
    # transfer owner to groupApprove
    app_client.call(
        bridge.transferOwner,
        _newOwner=gpapp_client.app_addr
    )

    codec = ABIType.from_string("(uint64)")
    encoded = codec.encode([1])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=4,
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
    value1 = stateAll.get('halted')
    print("value1:", value1)
    assert value1 == 1


@pytest.mark.groupApproveTransferOwner
def test_groupApproveTransferOwner(gpapp_client, app_client, owner,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    taskCount=0
    # transfer owner to groupApprove
    app_client.call(
        bridge.transferOwner,
        _newOwner=gpapp_client.app_addr
    )
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('owner')
    ownerAddr = encode_address(bytes.fromhex(value1))
    assert ownerAddr == gpapp_client.app_addr

    codec = ABIType.from_string("(address)")
    encoded = codec.encode([owner.address])

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
    assert ownerAddr == owner.address



@pytest.mark.groupApproveSetSmgFeeProxy
def test_groupApproveSetSmgFeeProxy(gpapp_client, app_client, owner, user,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    taskCount=0
    # transfer owner to groupApprove
    app_client.call(
        bridge.transferOwner,
        _newOwner=gpapp_client.app_addr
    )
    stateAll = app_client.get_global_state()
    value1 = stateAll.get('feeProxy')
    feeProxyAddr = encode_address(bytes.fromhex(value1))
    assert feeProxyAddr == user.address

    codec = ABIType.from_string("(address)")
    encoded = codec.encode([owner.address])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=5,
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
    logs = tx.tx_info['logs'][0]
    codec = ABIType.from_string(str(groupApprove.ApprovedAndExecuted().type_spec())) #(string,byte[32],uint64,uint64,byte[])
    print("str(groupApprove.ApprovedAndExecuted().type_spec()):", str(groupApprove.ApprovedAndExecuted().type_spec()))
    loga = codec.decode(base64.b64decode(logs))
    print("loga:", loga)
    assert loga[0] == 'ApprovedAndExecuted'
    assert bytes(bytearray(loga[1])) == smgID
    assert loga[2] == taskCount
    assert loga[3] == app_client.app_id    
    assert encode_address(bytes(bytearray(loga[4]))) == owner.address

    stateAll = app_client.get_global_state()
    value1 = stateAll.get('feeProxy')
    feeProxy = encode_address(bytes.fromhex(value1))
    assert feeProxy == owner.address





@pytest.mark.groupApproveTokenPair
def test_groupApproveTokenPair(gpapp_client, app_client, owner, user,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    taskCount=0
    # transfer owner to groupApprove
    app_client.call(
        bridge.transferOwner,
        _newOwner=gpapp_client.app_addr
    )

    tokenPairId666 = 666
    chainAlgo =  2147483931
    chainBase  = 1073741841
    account1 = bytes.fromhex("0000000000000000000000000000000000000000")
    account2 = bytes.fromhex("a4E62375593662E8fF92fAd0bA7FcAD25051EbCB")

    codeci = ABIType.from_string("(uint64,uint64,byte[],uint64,byte[])")
    encoded = codeci.encode([tokenPairId666, chainAlgo, account1, chainBase, account2])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=6,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    codect = ABIType.from_string(str(groupApprove.Task().type_spec())) 
    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codect.decode(binfo)
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
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )
    print("tx:", tx.tx_info)

    codec2 = ABIType.from_string(str(bridge.TokenPairInfo().type_spec())) 
    binfo = app_client.get_box_contents(getPrefixKey("mapTokenPairInfo", tokenPairId666))
    info = codec2.decode(binfo)
    print("info:", info)
    assert info[0] == tokenPairId666
    assert info[1] == chainAlgo 
    assert bytes(bytearray(info[2])) == account1
    assert info[3] == chainBase
    assert bytes(bytearray(info[4])) == account2


    # update token pair
    taskCount = taskCount+1
    encoded = codeci.encode([tokenPairId666, chainBase, account2, chainAlgo, account1])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=8,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codect.decode(binfo)
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
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )
    print("tx:", tx.tx_info)

    binfo = app_client.get_box_contents(getPrefixKey("mapTokenPairInfo", tokenPairId666))
    info = codec2.decode(binfo)
    print("info:", info)
    assert info[0] == tokenPairId666
    assert info[1] == chainBase
    assert bytes(bytearray(info[2])) == account2
    assert info[3] == chainAlgo 
    assert bytes(bytearray(info[4])) == account1



    # remove token pair
    taskCount = taskCount+1
    codeci = ABIType.from_string("(uint64)")
    encoded = codeci.encode([tokenPairId666])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=app_client.app_id,
        _proposalType=7,
        _data=encoded,
        boxes = [(gpapp_client.app_id, getPrefixKey("mapTask", taskCount))]
    )
    print("tx:", tx.tx_info)

    binfo = gpapp_client.get_box_contents(getPrefixKey("mapTask", taskCount))
    task = codect.decode(binfo)
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
            (app_client.app_id, getPrefixKey("mapTokenPairInfo", tokenPairId666))
        ]
    )
    print("tx:", tx.tx_info)

    tpKey = getPrefixKey("mapTokenPairInfo", tokenPairId666)
    allBox = app_client.get_box_names()
    print("allBox:", allBox)
    assert not tpKey in allBox


@pytest.mark.groupApproveTransferFoundation
def test_groupApproveTransferFoundation(gpapp_client, app_client, admin, owner,user,setStoreman):
    sp_big_fee = app_client.get_suggested_params()
    sp_big_fee.flat_fee = True
    sp_big_fee.fee = beaker.consts.milli_algo * 20
    taskCount=0

    stateAll = gpapp_client.get_global_state()
    value1 = stateAll.get('foundation')
    foundation = encode_address(bytes.fromhex(value1))
    assert foundation == owner.address

    codec = ABIType.from_string("(address)")
    encoded = codec.encode([admin.address])

    tx = gpapp_client.call(
        groupApprove.proposal,
        _chainId=chainAlgo,
        _to=gpapp_client.app_id,
        _proposalType=9,
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

    stateAll = gpapp_client.get_global_state()
    value1 = stateAll.get('foundation')
    foundation = encode_address(bytes.fromhex(value1))
    assert foundation == admin.address

    # transferFoundation is ABIReturnSubroutine, must be invoded via approveAndExecute
    try:
        tx = gpapp_client.call(
            groupApprove.transferFoundation,
            _newFoundation=user.address,
        )
        print("tx:", tx.tx_info)
    except Exception as e: 
        print("transferFoundation can not invoke, OK")
        return
    assert(False)