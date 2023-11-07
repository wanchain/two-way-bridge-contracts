from algosdk.abi import ABIType
from algosdk.atomic_transaction_composer import TransactionWithSigner
from algosdk.encoding import decode_address, encode_address
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
    acct = accts.pop()
    member_acct = accts.pop()
    
    app_client = beaker.client.ApplicationClient(
        beaker.localnet.get_algod_client(), oracle.app, signer=acct.signer
    )
    print("Creating app")
    app_client.create()
    print("Create success")
    
    print("Configing app")
    sp = app_client.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2000
    ptxn = PaymentTxn(
        acct.address,
        sp,
        app_client.app_addr,
        200000,
    )
    
    app_client.call(
        oracle.configure,
        seed=TransactionWithSigner(ptxn, acct.signer),
        owner=acct.address,
        admin=acct.address,
    )
    
    print("config success", app_client.app_id)
    
    app_client.call(
        oracle.set_storeman_group_config,
        smg_id=member_acct.address,
        gpk="abc",
        start_time=1699351331,
        end_time=1699351331,
        boxes=[(app_client.app_id, decode_address(member_acct.address))],
    )
    
    print_boxes(app_client)
    


if __name__ == "__main__":
    main()

