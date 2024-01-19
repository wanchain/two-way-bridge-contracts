from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    LogicSigTransactionSigner,
    TransactionWithSigner,
)
from algosdk.transaction import LogicSigAccount, PaymentTxn
from Cryptodome.Hash import keccak

import beaker
from beaker.precompile import PrecompiledLogicSignature

import EcSchnorrVerifier


def main() -> None:
    algod_client = beaker.localnet.get_algod_client()
    acct = beaker.localnet.get_accounts().pop()

    # Create app client
    app_client = beaker.client.ApplicationClient(
        algod_client, EcSchnorrVerifier.app, signer=acct.signer
    )

    # Now we should have the approval program available

    app_client.create()

    # Create a new app client with the lsig signer
    lsig_pc = PrecompiledLogicSignature(EcSchnorrVerifier.verify_lsig, algod_client)
    lsig_signer = LogicSigTransactionSigner(
        LogicSigAccount(lsig_pc.logic_program.raw_binary)
    )
    print("xxxx:", lsig_signer)
    lsig_client = app_client.prepare(signer=lsig_signer)

    atc = AtomicTransactionComposer()

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 3
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100001),
            signer=acct.signer,
        )
    )
    # atc.add_transaction(
    #     TransactionWithSigner(
    #         txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100002),
    #         signer=acct.signer,
    #     )
    # )    
    # atc.add_transaction(
    #     TransactionWithSigner(
    #         txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100003),
    #         signer=acct.signer,
    #     )
    # )
    # atc.add_transaction(
    #     TransactionWithSigner(
    #         txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100004),
    #         signer=acct.signer,
    #     )
    # )
    # atc.add_transaction(
    #     TransactionWithSigner(
    #         txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100005),
    #         signer=acct.signer,
    #     )
    # )

    # atc.add_transaction(
    #     TransactionWithSigner(
    #         txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100006),
    #         signer=acct.signer,
    #     )
    # )


    message = b"OpenZeppelin"
    m = keccak.new(digest_bits=256)
    m.update(message)
    hash = m.digest()

    sp_no_fee = algod_client.suggested_params()
    sp_no_fee.flat_fee = True
    # V0
    hex_signature = (
        "cabed943e1403fb93b388174c59a52c759b321855f2d7c4fcc23c99a8a6dce79"
        + "56192820dde344c32f81450db05e51c6a6f45a2a2db229f657d2c040baf315371b"
    )
    signature = bytes.fromhex(hex_signature)
    atc = lsig_client.add_method_call(
        atc,
        EcSchnorrVerifier.check_eth_sig,
        hash=hash,
        signature=signature,
        suggested_params=sp_no_fee,
    )



    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print(rv.return_value)


if __name__ == "__main__":
    main()
