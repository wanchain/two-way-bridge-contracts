import typing
from typing import Final
from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping, BoxList

TransactionHash = abi.StaticBytes[typing.Literal[32]]

class StoremanGroupConfig(abi.NamedTuple):
    gpk: abi.Field[abi.String]
    start_time: abi.Field[abi.Uint64]
    end_time: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint8]

class TokenPairInfo(abi.NamedTuple):
    id: abi.Field[abi.Uint16]
    from_chain_id: abi.Field[abi.Uint64]
    from_account: abi.Field[abi.String]
    to_chain_id: abi.Field[abi.Uint64]
    to_account: abi.Field[abi.String]

class WanBridgeState:
    """
    Wan Bridge State of a storeman group
    """
    smgs = BoxMapping(abi.Address, StoremanGroupConfig)
    token_pairs = BoxMapping(abi.Uint16, TokenPairInfo)
    pair_list = BoxList(abi.Uint16, 200) # max 200 pairs
    tx_status = BoxMapping(TransactionHash, abi.Bool)
    contract_fees = BoxMapping(abi.Uint16, abi.Uint64)

    total_pair_count: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="total pair count",
    )
    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the oracle",
    )
    oracle_admin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="oracle_admin of the oracle",
    )
    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )
    latest_wrapped_token_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="latest wrapped token id",
    )
        

app = Application(
    "WanBridge", 
    descr="WanBridge Contract", 
    state=WanBridgeState()
)

###
# API Methods
###
@app.external
def user_lock() -> Expr:
    return Reject()

@app.external
def user_burn(
    pair_id: abi.Uint16, 
    asset_id: abi.Asset, 
    amount: abi.Uint64, 
    tokenAccount: abi.Address,
    userAccount: abi.Address,
    fee_tx: abi.PaymentTransaction,
    ) -> Expr:
    # check if the pair exists
    return Seq(
        Assert(fee_tx.get().receiver() == Global.current_application_address()),
        Assert(app.state.contract_fees[pair_id].exists() == Int(1)),
        Assert(fee_tx.get().amount() == app.state.contract_fees[pair_id].get()),
        burn_wrapped_token(asset_id, Txn.sender(), amount),
        Log(Concat(Bytes("user_burn:"), 
            Itob(pair_id.get()),
            Bytes(":"),
            Itob(amount.get()),
            Bytes(":"),
            tokenAccount.get(),
            Bytes(":"),
            userAccount.get()),
        ),
    )

@app.external
def smg_mint() -> Expr:
    return Reject()

@app.external
def smg_release() -> Expr:
    return Reject()

@app.external(authorize=Authorize.only(app.state.oracle_admin.get()))
def set_storeman_group_config(
    smg_id: abi.Address,
    gpk: abi.String,
    start_time: abi.Uint64,
    end_time: abi.Uint64,
) -> Expr:
    return Seq(
        (status := abi.Uint8()).set(Int(0)),
        (info := StoremanGroupConfig()).set(gpk, start_time, end_time, status),
        app.state.smgs[smg_id].set(info)
    )

@app.external(authorize=Authorize.only(app.state.oracle_admin.get()))
def set_storeman_group_status(
    smg_id: abi.Address,
    status: abi.Uint8,
) -> Expr:
    return Seq(
        (info := StoremanGroupConfig()).decode(
            app.state.smgs[smg_id].get()
        ),
        (gpk := abi.String()).set(info.gpk),
        (start_time := abi.Uint64()).set(info.start_time),
        (end_time := abi.Uint64()).set(info.end_time),
        (infoNew := StoremanGroupConfig()).set(gpk, start_time, end_time, status),
        app.state.smgs[smg_id].set(infoNew)
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def transfer_ownership(
    new_owner: abi.Address,
) -> Expr:
    return Seq(
        app.state.owner.set(new_owner.get())
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def transfer_oracle_admin(
    new_admin: abi.Address,
) -> Expr:
    return Seq(
        app.state.oracle_admin.set(new_admin.get())
    )
    
@app.external
def get_oracle_admin(*, output: abi.Address) -> Expr:
    return output.set(app.state.oracle_admin.get())

@app.external
def get_owner(*, output: abi.Address) -> Expr:
    return output.set(app.state.owner.get())

@app.external
def get_smg_info(
    smg_id: abi.Address,
    *,
    output: StoremanGroupConfig,
) -> Expr:
    return app.state.smgs[smg_id].store_into(output)

@app.external(authorize=Authorize.only(app.state.owner.get()))
def create_wrapped_token(
    name: abi.String,
    symbol: abi.String,
    decimals: abi.Uint8,
    total_supply: abi.Uint64,
) -> Expr:
    return Seq(
        app.state.latest_wrapped_token_id.set(do_create_wrapped_token(name, symbol, decimals, total_supply)),
        Log(Concat(Bytes("create_wrapped_token:"), 
            Itob(app.state.latest_wrapped_token_id.get()),
            name.get(),
            Bytes(":"),
            symbol.get(),
            Bytes(":"),
            Itob(decimals.get())),
        ),
    )

@app.external
def get_latest_wrapped_token_id(*, output: abi.Uint64) -> Expr:
    return output.set(app.state.latest_wrapped_token_id.get())

@app.external(authorize=Authorize.only(app.state.owner.get()))
def opt_in_token_id(
    id: abi.Uint64,
) -> Expr:
    return Seq(do_opt_in(id.get()))

@app.external(authorize=Authorize.only(app.state.owner.get()))
def add_token_pair(
    id: abi.Uint16,
    from_chain_id: abi.Uint64,
    from_account: abi.String,
    to_chain_id: abi.Uint64,
    to_account: abi.String,
) -> Expr:
    return Seq(
        Assert(app.state.token_pairs[id].exists() == Int(0)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account,
        ),
        app.state.token_pairs[id].set(info),
        app.state.pair_list[app.state.total_pair_count.get()].set(id),
        app.state.total_pair_count.set(app.state.total_pair_count.get() + Int(1)),
        Log(Concat(
            Bytes("add_token_pair:"),
            Itob(id.get()),
            Bytes(":"),
            Itob(from_chain_id.get()),
            Bytes(":"),
            from_account.get(),
            Bytes(":"),
            Itob(to_chain_id.get()),
            Bytes(":"),
            to_account.get(),
        )),
    )
    
@app.external(authorize=Authorize.only(app.state.owner.get()))
def update_token_pair(
    id: abi.Uint16,
    from_chain_id: abi.Uint64,
    from_account: abi.String,
    to_chain_id: abi.Uint64,
    to_account: abi.String,
) -> Expr:
    return Seq(
        Assert(app.state.token_pairs[id].exists() == Int(1)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account,
        ),
        app.state.token_pairs[id].set(info),
        Log(Concat(
            Bytes("update_token_pair:"),
            Itob(id.get()),
            Bytes(":"),
            Itob(from_chain_id.get()),
            Bytes(":"),
            from_account.get(),
            Bytes(":"),
            Itob(to_chain_id.get()),
            Bytes(":"),
            to_account.get(),
        )),
    )

@app.external
def get_token_pair(
    id: abi.Uint16,
    *,
    output: TokenPairInfo,
) -> Expr:
    return app.state.token_pairs[id].store_into(output)

  
##############
# Utility methods for inner transactions
##############

@Subroutine(TealType.none)
def mint_wrapped_token(
    asset_id: abi.Uint64,
    to: abi.Address,
    amount: abi.Uint64,
) -> Expr:
    return Seq(
        do_axfer(to.get(), asset_id.get(), amount.get()),
        Log(Concat(Bytes("mint_token:"), Itob(asset_id.get()), Bytes(":"), to.get(), Bytes(":"), Itob(amount.get()))),
    )

@Subroutine(TealType.none)
def burn_wrapped_token(
    asset_id: abi.Uint64,
    holder: abi.Address,
    amount: abi.Uint64,
) -> Expr:
    return Seq(
        do_ax_burn(holder.get(), asset_id.get(), amount.get()),
        Log(Concat(Bytes("burn_token:"), Itob(asset_id.get()), Bytes(":"), holder.get(), Bytes(":"), Itob(amount.get()))),
    )

@Subroutine(TealType.none)
def do_axfer(rx: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_receiver: rx,
            TxnField.fee: Int(1000),
        }
    )

@Subroutine(TealType.none)
def do_ax_burn(holder: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_sender: holder,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.fee: Int(1000),
            TxnField.sender: Global.current_application_address(),
        }
    )

@Subroutine(TealType.none)
def do_opt_in(aid: Expr) -> Expr:
    return do_axfer(Global.current_application_address(), aid, Int(0))


@Subroutine(TealType.uint64)
def do_create_wrapped_token(
    name: abi.String,
    symbol: abi.String,
    decimals: abi.Uint8,
    total_supply: abi.Uint64,
) -> Expr:
    return Seq(
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetConfig,
                TxnField.config_asset_name: name.get(),
                TxnField.config_asset_unit_name: symbol.get(),
                TxnField.config_asset_total: total_supply.get(),
                TxnField.config_asset_decimals: decimals.get(),
                TxnField.config_asset_manager: Global.current_application_address(),
                TxnField.config_asset_reserve: Global.current_application_address(),
                TxnField.config_asset_clawback: Global.current_application_address(),
                TxnField.config_asset_url: Bytes("https://bridge.wanchain.org"),
                TxnField.fee: Int(1000),
            }
        ),
        InnerTxn.created_asset_id(),
    )


###
# App lifecycle
###

@app.create
def create() -> Expr:
    return app.initialize_global_state()

@app.external(authorize=Authorize.only(Global.creator_address()))
def initialize(
    seed: abi.PaymentTransaction, # pay for minimum balance
    owner: abi.Address, 
    oracle_admin: abi.Address) -> Expr:
    """Initializes the global state of the app.

    Args:
        owner: address of the owner
        oracle_admin: address of the oracle_admin
    """
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        app.state.owner.set(owner.get()),
        app.state.oracle_admin.set(oracle_admin.get()),
        app.state.initialized.set(Int(1)),
    )

@app.update(authorize=Authorize.only(app.state.owner.get()))
def update() -> Expr:
    return Approve()

@app.delete
def delete() -> Expr:
    return Reject()

@app.opt_in
def opt_in() -> Expr:
    return Approve()

@app.clear_state
def clear_state() -> Expr:
    return Approve()

@app.close_out
def close_out() -> Expr:
    return Approve()

if __name__ == "__main__":
    app.build().export("./artifacts_oracle")
    print("done")
