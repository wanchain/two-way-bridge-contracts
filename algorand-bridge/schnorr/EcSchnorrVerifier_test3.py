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
    
    sp_no_fee = algod_client.suggested_params()
    sp_no_fee.flat_fee = True



    # signature:		0x8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6 
    # px:			0x88ef3369fc869985783738c1db70ebb0ab6b91a2e7a4fcc2b70ead6e861fcadb 
    # py:			0x0000000000000000000000000000000000000000000000000000000000000000 
    # e:			0xa1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105 
    # parity:		0x000000000000000000000000000000000000000000000000000000000000001b 
    # message:		0xd174910b50affeb72000a49a9fafaddd0da395586559227196fcf1743b2c6fc5

    signature = bytes.fromhex("8260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e6")
    px      = bytes.fromhex("88ef3369fc869985783738c1db70ebb0ab6b91a2e7a4fcc2b70ead6e861fcadb")
    py      = bytes.fromhex("0000000000000000000000000000000000000000000000000000000000000000")
    e       = bytes.fromhex("a1dfceb88b3ed8b87f5452a9a2ddbc9e2d3bb9024203785b6ba7b4faea164105")
    parity  = bytes.fromhex("000000000000000000000000000000000000000000000000000000000000001b")
    message = bytes.fromhex("d174910b50affeb72000a49a9fafaddd0da395586559227196fcf1743b2c6fc5")

    # the middle value:


    atc = app_client.add_method_call(
        atc,
        EcSchnorrVerifier.check_ecSchnorr_sig,
        signature=signature,
        px=px,
        py=py,
        e=e,
        parity=parity,
        message=message,
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
