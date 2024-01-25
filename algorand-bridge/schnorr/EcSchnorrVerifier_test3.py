from Cryptodome.Hash import keccak
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    LogicSigTransactionSigner,
    TransactionWithSigner,
)
from algosdk.transaction import LogicSigAccount, PaymentTxn
import beaker
from beaker.precompile import PrecompiledLogicSignature

import EcSchnorrVerifier


def main() -> None:
    acct = beaker.localnet.get_accounts().pop()

    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), EcSchnorrVerifier.app, signer=acct.signer
    )
    algod_client = app_client.client

    # Now we should have the approval program available
    app_client.create()
    print("app_client.app_id:", app_client.app_id, app_client.app_addr)

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 12
    

    signature = bytes.fromhex("8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6")
    px      = bytes.fromhex("88ef3369fc869985783738c1db70ebb0ab6b91a2e7a4fcc2b70ead6e861fcadb")
    py      = bytes.fromhex("0000000000000000000000000000000000000000000000000000000000000000")
    e       = bytes.fromhex("a1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105")
    parity  = bytes.fromhex("000000000000000000000000000000000000000000000000000000000000001b")
    message = bytes.fromhex("d174910b50affeb72000a49a9fafaddd0da395586559227196fcf1743b2c6fc5")
   

    tx = app_client.call(
        EcSchnorrVerifier.verify,
        # curveID = 0,
        signature=signature,
        px=px,
        py=py,
        e=e,
        parity=parity,
        message=message,
        suggested_params=sp_with_fees,
    )
    print('txinfo:', tx.return_value, tx.tx_info)



if __name__ == "__main__":
    main()
