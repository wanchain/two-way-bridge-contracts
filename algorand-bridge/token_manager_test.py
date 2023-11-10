import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn, AssetCreateTxn
from algosdk import account, transaction

import beaker

import token_manager

record_codec = ABIType.from_string(str(token_manager.TokenPairInfo().type_spec()))


def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        if box_name == b"pair_list":
            print(bytes.hex(contents))
        else:
            membership_record = record_codec.decode(contents)
            print(f"\t{box_name} => {membership_record} ")

def main() -> None:
    accts = beaker.localnet.get_accounts()
    creator = accts.pop()
    owner = accts.pop()
    admin = accts.pop()

    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), token_manager.app, signer=creator.signer
    )

    print("Creating app")
    app_client.create()
    print("Create success")

    owner_client = app_client.prepare(signer=owner.signer)
    admin_client = app_client.prepare(signer=admin.signer)
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    
    # Pay for minimum balance
    ptxn = PaymentTxn(
        creator.address,
        sp,
        app_client.app_addr,
        300000,
    )
    
    app_client.call(
        token_manager.initialize,
        seed=TransactionWithSigner(ptxn, creator.signer),
        owner=owner.address,
        admin=admin.address,
        operator=creator.address,
        boxes=[(app_client.app_id, "pair_list")] * 8,
    )


    # Should not be able to initialize again
    try:
        app_client.call(
            token_manager.initialize,
            seed=TransactionWithSigner(ptxn, creator.signer),
            owner=owner.address,
            admin=admin.address,
            operator=creator.address,
            boxes=[(app_client.app_id, "pair_list")] * 8,
        )
    except Exception as e:
        print('pass')

    # Create Wrapped Token
    print("Creating wrapped token")
    app_client.fund(200000) # deposit for minimum balance require
    owner_client.call(
        token_manager.create_wrapped_token,
        name="WAN@algorand",
        symbol="WAN",
        decimals=6,
        total_supply=100000000000000
    )

    # Should not be able to create wrapped token by others
    try:
        admin_client.call(
            token_manager.create_wrapped_token,
            name="WAN@algorand",
            symbol="WAN",
            decimals=6,
            total_supply=100000000000000
        )
    except Exception as e:
        print('pass')

    # get_latest_wrapped_token_id
    print("Getting latest wrapped token id")
    tokenId = owner_client.call(token_manager.get_latest_wrapped_token_id)
    print(tokenId.return_value)

    # Test add_token_pair
    print("Adding token pair")
    owner_client.fund(200000) # deposit for minimum balance require
    owner_client.call(
        token_manager.add_token_pair,
        id=666,
        from_chain_id=2153201998,
        from_account="0x0000000000000000000000000000000000000000",
        to_chain_id=2147483931, # algorand
        to_account=str(tokenId.return_value),
        boxes=[(app_client.app_id, bytes.fromhex('029a')), (app_client.app_id, "pair_list")]
    )

    print('get token pair')
    pair = app_client.call(
        token_manager.get_token_pair,
        id=666,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )

    assert pair.return_value[2] == '0x0000000000000000000000000000000000000000'


    # Should not be able to add_token_pair for same pair Id again
    try:
        owner_client = app_client.prepare(signer=owner.signer)
        owner_client.fund(200000) # deposit for minimum balance require
        owner_client.call(
            token_manager.add_token_pair,
            id=666,
            from_chain_id=2153201998,
            from_account="0x0000000000000000000000000000000000000000",
            to_chain_id=2147483931,
            to_account="COWRL7GQH3RJFRSPZU4OM5RFYLKZPOOJZA7ZTNQUNPBEFP3L5UUP4HS75Y",
            boxes=[(app_client.app_id, bytes.fromhex('029a')), (app_client.app_id, "pair_list")]
        )
    except Exception as e:
        print('pass')
    
    print_boxes(app_client)

    print('update token pair')
    owner_client.call(
        token_manager.update_token_pair,
        id=666,
        from_chain_id=2153201998,
        from_account="0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB",
        to_chain_id=2147483931, # algorand
        to_account=str(tokenId.return_value),
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )

    print('get token pair')
    pair = app_client.call(
        token_manager.get_token_pair,
        id=666,
        boxes=[(app_client.app_id, bytes.fromhex('029a'))]
    )

    assert pair.return_value[2] == '0xa4E62375593662E8fF92fAd0bA7FcAD25051EbCB'

    print_boxes(app_client)

    print('create demo asset token')

    ctxn = AssetCreateTxn(
        owner.address,
        sp,
        total=100000000000000,
        default_frozen=False,
        unit_name="MOCK",
        asset_name="MOCK TOKEN",
        manager=creator.address,
        reserve=creator.address,
        freeze=creator.address,
        clawback=creator.address,
        url="https://bridge.wanchain.org",
        decimals=6,
    )
    tx = owner.signer.sign_transactions([ctxn], [0])
    txid = beaker.localnet.get_algod_client().send_transaction(tx[0])
    print('txid', txid)
    receipt = transaction.wait_for_confirmation(beaker.localnet.get_algod_client(), txid)
    print('receipt', receipt['asset-index'])
    asset_id = receipt['asset-index']

    # optIn test asset
    print("optIn test asset")
    app_client.fund(200000) # deposit for minimum balance require
    owner_client.call(
        token_manager.opt_in_token_id,
        id=asset_id,
        foreign_assets=[asset_id],
    )

    asset_id = tokenId.return_value
    print("mint wrapped token", asset_id)
    
    aitx = AssetOptInTxn(
        owner.address,
        sp,
        asset_id,
    )
    
    aitx = aitx.sign(owner.signer.private_key)
    txid = beaker.localnet.get_algod_client().send_transaction(aitx)
    
    admin_client.call(
        token_manager.mint_wrapped_token,
        asset_id=asset_id,
        amount=1000,
        to=owner.address,
        foreign_assets=[asset_id],
        accounts=[owner.address],
    )
    
    account_info = beaker.localnet.get_algod_client().account_info(owner.address)
    
    asset_balance = 0
    if 'assets' in account_info:
        for asset in account_info['assets']:
            if asset['asset-id'] == asset_id:
                asset_balance = asset['amount']
                break
    
    print('balance', asset_balance)
    assert asset_balance == 1000

    print('burn wrapped token', asset_id)
    admin_client.call(
        token_manager.burn_wrapped_token,
        asset_id=asset_id,
        amount=1000,
        holder=owner.address,
        foreign_assets=[asset_id],
        accounts=[owner.address],
    )

    account_info = beaker.localnet.get_algod_client().account_info(owner.address)
    
    asset_balance = 0
    if 'assets' in account_info:
        for asset in account_info['assets']:
            if asset['asset-id'] == asset_id:
                asset_balance = asset['amount']
                break
    
    print('balance', asset_balance)
    assert asset_balance == 0

    print('done')

if __name__ == "__main__":
    main()
