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


    atc = AtomicTransactionComposer()

    # Add a payment just to cover fees
    sp_with_fees = algod_client.suggested_params()
    sp_with_fees.flat_fee = True
    sp_with_fees.fee = beaker.consts.milli_algo * 6
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100001),
            signer=acct.signer,
        )
    )
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100002),
            signer=acct.signer,
        )
    )
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100003),
            signer=acct.signer,
        )
    )
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100004),
            signer=acct.signer,
        )
    )
    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100005),
            signer=acct.signer,
        )
    )

    atc.add_transaction(
        TransactionWithSigner(
            txn=PaymentTxn(acct.address, sp_with_fees, acct.address, 100006),
            signer=acct.signer,
        )
    )
    message = b"testdata"
    m = keccak.new(digest_bits=256)
    m.update(message)
    hash = m.digest()
    print("hash:", hash.hex())
    sp_no_fee = algod_client.suggested_params()
    sp_no_fee.flat_fee = True





    # V0
    hex_signature = (
        "cabed943e1403fb93b388174c59a52c759b321855f2d7c4fcc23c99a8a6dce79"
        + "56192820dde344c32f81450db05e51c6a6f45a2a2db229f657d2c040baf315371c"
    )
    signature = bytes.fromhex(hex_signature)


    atc = app_client.add_method_call(
        atc,
        EcSchnorrVerifier.check_eth_sig,
        hash=hash,
        signature=signature,
        suggested_params=sp_no_fee,
    )



    result = atc.execute(algod_client, 3)
    for rv in result.abi_results:
        print(rv.return_value)

    # ret = app_client.call(
    #     EcSchnorrVerifier.check_eth_sig,
    #     hash=hash,
    #     signature=signature
    # )
    # print("ret:", ret.return_value)


    # message = b"OpenZeppelin"
    # m = keccak.new(digest_bits=256)
    # m.update(message)
    # hash = m.digest()

    # sp_no_fee = algod_client.suggested_params()
    # sp_no_fee.flat_fee = True
    # # V0
    # hex_signature = (
    #     "5d99b6f7f6d1f73d1a26497f2b1c89b24c0993913f86e9a2d02cd69887d9c94f"
    #     + "3c880358579d811b21dd1b7fd9bb01c1d81d10e69f0384e675c32b39643be8921b"
    # )
    # signature = bytes.fromhex(hex_signature)
    # atc = lsig_client.add_method_call(
    #     atc,
    #     eth_checker.check_eth_sig,
    #     hash=hash,
    #     signature=signature,
    #     suggested_params=sp_no_fee,
    # )

    # # V1
    # hex_signature = (
    #     "331fe75a821c982f9127538858900d87d3ec1f9f737338ad67cad133fa48feff"
    #     + "48e6fa0c18abc62e42820f05943e47af3e9fbe306ce74d64094bdf1691ee53e01c"
    # )
    # signature = bytes.fromhex(hex_signature)
    # atc = lsig_client.add_method_call(
    #     atc,
    #     eth_checker.check_eth_sig,
    #     hash=hash,
    #     signature=signature,
    #     suggested_params=sp_no_fee,
    # )

    # result = atc.execute(algod_client, 4)
    # for rv in result.abi_results:
    #     print(rv.return_value)


if __name__ == "__main__":
    main()
