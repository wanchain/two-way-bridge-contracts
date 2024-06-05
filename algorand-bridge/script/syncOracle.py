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



IsTestnet = True
old_app_id = 627255629

smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303634') #testnet_064
GPK = bytes.fromhex('35e9205bb65e63949487b0cc52e502ace1bb1daa67c6df7f3ea6aaef023f15a91a33284be3eacd928c1f41b5d8f24c46a31234d282758e1ff624fe728838e386')


def setOracle(app_client) -> None:
    status = app_client.client.status()
    block_info = app_client.client.block_info(status['last-round'])
    timestamp = block_info['block']['ts']
    startTime = timestamp-1000000
    endTime = timestamp+1000000
 
    tx = app_client.call(
        bridge.setStoremanGroupConfig,
        id=smgID,
        status=5,
        startTime=startTime,
        endTime=endTime,
        gpk=GPK,
        boxes=[
            (app_client.app_id, smgID),
            (app_client.app_id, getPrefixAddrKey("mapAdmin", app_client.get_sender())),
        ],
    )
    transaction.wait_for_confirmation(app_client.client, tx.tx_id, 1)






def main() -> None:
    prov = Provider(IsTestnet)
    print("deployer:", prov.acct_addr)
    
    if old_app_id == 0:
        prov.create()
    else:
        prov.connect(old_app_id, bridge.app)

    setOracle(prov.app_client)
    return




if __name__ == "__main__":
    main()





