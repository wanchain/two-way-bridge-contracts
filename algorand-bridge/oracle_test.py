import os
from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address, encode_as_bytes
from algosdk.transaction import AssetOptInTxn, PaymentTxn

import beaker

import oracle

record_codec = ABIType.from_string(str(oracle.StoremanGroupConfig().type_spec()))


def print_boxes(app_client: beaker.client.ApplicationClient) -> None:
    boxes = app_client.get_box_names()
    print(f"{len(boxes)} boxes found")
    for box_name in boxes:
        contents = app_client.get_box_contents(box_name)
        if box_name == b"affirmations":
            print(contents)
        else:
            membership_record = record_codec.decode(contents)
            print(f"\t{encode_address(box_name)} => {membership_record} ")


def main() -> None:
    accts = beaker.localnet.get_accounts()
    print(accts)
    creator = accts.pop()
    owner = accts.pop()
    admin = accts.pop()
    
    # Must use algorand address format for smgId
    smgId = encode_address(bytes.fromhex('000000000000000000000000000000000000000000746573746e65745f303538'))
    
    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), oracle.app, signer=creator.signer
    )
    print("Creating app")
    app_client.create()
    print("Create success")
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    
    # Pay for minimum balance
    ptxn = PaymentTxn(
        creator.address,
        sp,
        app_client.app_addr,
        200000,
    )
    
    app_client.call(
        oracle.initialize,
        seed=TransactionWithSigner(ptxn, creator.signer),
        owner=owner.address,
        admin=admin.address,
    )

    # Should not be able to initialize again
    try:
        app_client.call(
            oracle.initialize,
            seed=TransactionWithSigner(ptxn, creator.signer),
            owner=owner.address,
            admin=admin.address,
        )
    except Exception as e:
        print('pass')
    
    print("config success", app_client.app_id)
    
    read_owner = app_client.call(
        oracle.get_owner
    )
    print(read_owner.return_value)
    assert read_owner.return_value == owner.address
    
    read_admin = app_client.call(
        oracle.get_admin
    )
    
    assert read_admin.return_value == admin.address
    
    owner_client = app_client.prepare(signer=owner.signer)
    
    admin_client = app_client.prepare(signer=admin.signer)
    
    admin_client.call(
        oracle.set_storeman_group_config,
        smg_id=smgId,
        gpk="abc",
        start_time=1699351331,
        end_time=1799351331,
        boxes=[(app_client.app_id, decode_address(smgId))], # Must append app_id and box key for tx
    )
    
    # Test for 100 boxes
    for i in range(100):
        random_bytes = os.urandom(32)
        _smgId = encode_address(random_bytes)
        
        # Pay for minimum balance
        admin_client.fund(100000)
        
        admin_client.call(
            oracle.set_storeman_group_config,
            smg_id=_smgId,
            gpk="abc",
            start_time=1699351331,
            end_time=1799351331,
            boxes=[(app_client.app_id, decode_address(_smgId))], # Must append app_id and box key for tx
        )
    
    print_boxes(app_client)

    admin_client.call(
        oracle.set_storeman_group_status,
        smg_id=smgId,
        status=5,
        boxes=[(app_client.app_id, decode_address(smgId))],
    )
    
    smg_info = app_client.call(
        oracle.get_smg_info,
        smg_id=smgId,
        boxes=[(app_client.app_id, decode_address(smgId))],
    )
    
    print(smg_info.return_value)
    
    assert smg_info.return_value[3] == 5
    
    # Test for update
    owner_client.update()
    print('update finish')
    
    # Admin should not be able to update
    try:
        admin_client.update()
        assert False
    except Exception as e:
        print('pass')
        
    # Creator should not be able to update
    try:
        app_client.update()
        assert False
    except Exception as e:
        print('pass')

if __name__ == "__main__":
    main()

