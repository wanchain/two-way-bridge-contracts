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
import time
import bridge
from utils import *



IsTestnet = True
old_app_id = 627255629

smgID=bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303631') #testnet_061
GPK = bytes.fromhex('dacc38e9bc3a8ccf2a0642a1481ab3ba4480d9a804927c84c621ac394d556b01351f98176e1614272a242f6ca31d21b8baead46be6b0c0f354a4fbfb477f6809') # not mpc


def setOracle(app_client) -> None:
    status = app_client.client.status()
    block_info = app_client.client.block_info(status['last-round'])
    timestamp = block_info['block']['ts']
    startTime = timestamp-10000000
    endTime = timestamp+10000000
    app_client.call(
        bridge.setStoremanGroupPreConfig,
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
    time.sleep(6)
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





