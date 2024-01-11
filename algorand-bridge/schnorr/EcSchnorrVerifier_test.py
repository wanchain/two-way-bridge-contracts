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
    acct = beaker.localnet.get_accounts().pop()

    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), EcSchnorrVerifier.app, signer=acct.signer
    )
    algod_client = app_client.client

    # Now we should have the approval program available
    app_client.create()

    message = b"OpenZeppelin"
    m = keccak.new(digest_bits=256)
    m.update(message)
    hash = m.digest()

    sp_no_fee = algod_client.suggested_params()
    sp_no_fee.flat_fee = True
    # V0
    hex_signature = (
        "5d99b6f7f6d1f73d1a26497f2b1c89b24c0993913f86e9a2d02cd69887d9c94f"
        + "3c880358579d811b21dd1b7fd9bb01c1d81d10e69f0384e675c32b39643be8921b"
    )
    signature = bytes.fromhex(hex_signature)
    ret = app_client.call(
        EcSchnorrVerifier.check_eth_sig,
        hash=hash,
        signature=signature
    )
    print("ret:", ret.return_value)


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
