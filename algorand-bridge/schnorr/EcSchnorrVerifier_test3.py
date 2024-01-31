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
    

    signature = bytes.fromhex("c23ce3a9f9bf8b4953807fdf3f0fbd7b1b7f8e08f2567515b04ac9687ea66337")
    px      = bytes.fromhex("8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104")
    py      = bytes.fromhex("0000000000000000000000000000000000000000000000000000000000000000")
    e       = bytes.fromhex("a423c56d531277a07ae3fb7ef34893c74f5d1f76fa0e1cad047497c413c3fc84")
    parity  = bytes.fromhex("000000000000000000000000000000000000000000000000000000000000001c")
    message = bytes.fromhex("a3f181fd40cd78f056ee4afd4d1df2a3f1dfbea3c3d72eb64774b95e84fcbd09")
   

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
