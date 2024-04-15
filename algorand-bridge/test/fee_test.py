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

tokenPairId666 = 666
tokenPairId888 = 888

chainAlgo =  2147483931
chainBase  = 1073741841
chainMaticZk = 1073741838


@pytest.mark.fee
def test_fee(app_client):
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = beaker.consts.milli_algo

    # #token pair fee
    app_client.call(
        bridge.setTokenPairFee,
        tokenPairID=tokenPairId666,
        contractFee=1111,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
   )
    
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
    )
    print("fee:", fee.return_value)
    assert(fee.return_value == 1111)
    
    app_client.call(
        bridge.setTokenPairFees,
        tokenPairID=[tokenPairId666,tokenPairId888],
        contractFee=[1111,9999999],
        boxes=[
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId666)),
            (app_client.app_id, getPrefixKey("mapTokenPairContractFee", tokenPairId888))
        ]
    )
    
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId666,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId666))],
        suggested_params=sp
    )
    assert(fee.return_value == 1111)
    sp.fee += 1
    fee = app_client.call(
        bridge.getTokenPairFee,
        tokenPairID=tokenPairId888,
        boxes=[(app_client.app_id,  getPrefixKey("mapTokenPairContractFee", tokenPairId888))],
        suggested_params=sp
    )
    assert(fee.return_value == 9999999)
     

    app_client.call(
        bridge.setFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,
        contractFee=222,
        agentFee=444,
        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo))
        ],
        suggested_params=sp
    )
    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainBase,
        destChainID=chainAlgo,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainAlgo)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainAlgo))
        ],
        suggested_params=sp
    )
    assert(fee.return_value == [222, 444])

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
        ],
        suggested_params=sp
    )
    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainBase,
        destChainID=chainMaticZk,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainBase*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainBase*2**32+chainMaticZk))
        ],
        suggested_params=sp
    )
    assert(fee.return_value == [222, 444])

    fee = app_client.call(
        bridge.getFee,
        srcChainID=chainAlgo,
        destChainID=chainMaticZk,

        boxes=[
            (app_client.app_id, getPrefixKey("mapContractFee", chainAlgo*2**32+chainMaticZk)),
            (app_client.app_id, getPrefixKey("mapAgentFee", chainAlgo*2**32+chainMaticZk))
        ],
        suggested_params=sp
    )
    assert(fee.return_value == [333, 555])








