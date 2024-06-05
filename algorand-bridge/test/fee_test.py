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

import bridge
from utils import *
import pytest

tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838


@pytest.mark.fee
def test_fee(app_client_admin):
    # #token pair fee
    app_client_admin.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=1111,
        boxes=[(app_client_admin.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ]
    )

    codec = ABIType.from_string("uint64") 
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapTokenPairContractFee", tokenPairId666))
    fee = codec.decode(bfee)
    print("fee:", fee)
    assert(fee == 1111)
    
    app_client_admin.call(
        bridge.setTokenPairFees,
        tokenPairID=[tokenPairId666,tokenPairId888],
        contractFee=[1111,9999999],
        boxes=[
            (app_client_admin.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client_admin.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId888)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ]
    )
    
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapTokenPairContractFee", tokenPairId666))
    fee = codec.decode(bfee)
    print("fee:", fee)
    assert(fee == 1111)
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapTokenPairContractFee", tokenPairId888))
    fee = codec.decode(bfee)
    print("fee:", fee)
    assert(fee == 9999999)

    app_client_admin.call(
        bridge.setFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,
        contractFee=222,
        agentFee=444,
        boxes=[
            (app_client_admin.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client_admin.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ]
    )
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo))
    fee = codec.decode(bfee)
    print(" contract fee:", fee)
    assert(fee == 222)

    bfee = app_client_admin.get_box_contents(getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo))
    fee = codec.decode(bfee)
    print(" agent fee:", fee)
    assert(fee == 444)

    app_client_admin.call(
        bridge.setFees,
        srcChainID=[chainBase,chainAlgo],
        destChainID=[chainMaticZk,chainMaticZk],
        contractFee=[222, 333],
        agentFee=[444, 555],
        boxes=[
            (app_client_admin.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk)),
            (app_client_admin.app_id, getPrefixKey("mapAgentFee",    chainBase*2**32+chainMaticZk)),
            (app_client_admin.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk)),
            (app_client_admin.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainMaticZk)),
            (app_client_admin.app_id, getPrefixAddrKey("mapAdmin", app_client_admin.sender))
        ]
    )

    bfee = app_client_admin.get_box_contents(getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk))
    fee = codec.decode(bfee)
    print(" contract fee:", fee)
    assert(fee == 222)
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk))
    fee = codec.decode(bfee)
    print(" contract fee:", fee)
    assert(fee == 333)

    bfee = app_client_admin.get_box_contents(getPrefixKey("mapAgentFee",    chainBase*2**32+chainMaticZk))
    fee = codec.decode(bfee)
    print(" agent fee:", fee)
    assert(fee == 444)
    bfee = app_client_admin.get_box_contents(getPrefixKey("mapAgentFee",    chainAlgo*2**32+chainMaticZk))
    fee = codec.decode(bfee)
    print(" agent fee:", fee)
    assert(fee == 555)


@pytest.mark.fee
@pytest.mark.xfail
def test_setTokenPairFee_notadmin(app_client):
    # #token pair fee
    app_client.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=1111,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )


@pytest.mark.fee
@pytest.mark.xfail
def test_setTokenPairFees_notadmin(app_client):
    app_client.call(
        bridge.setTokenPairFees,
        tokenPairID=[tokenPairId666,tokenPairId888],
        contractFee=[1111,9999999],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId888)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )
@pytest.mark.fee
@pytest.mark.xfail
def test_setFee_notadmin(app_client):
    app_client.call(
        bridge.setFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,
        contractFee=222,
        agentFee=444,
        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

@pytest.mark.fee
@pytest.mark.xfail
def test_setFees_notadmin(app_client):        
    app_client.call(
        bridge.setFees,
        srcChainID=[chainBase,chainAlgo],
        destChainID=[chainMaticZk,chainMaticZk],
        contractFee=[222, 333],
        agentFee=[444, 555],
        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee",    chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.sender))
        ]
    )

