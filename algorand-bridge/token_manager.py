from typing import Final
from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping, BoxList

class TokenPairInfo(abi.NamedTuple):
    id: abi.Field[abi.Uint16]
    from_chain_id: abi.Field[abi.Uint64]
    from_account: abi.Field[abi.String]
    to_chain_id: abi.Field[abi.Uint64]
    to_account: abi.Field[abi.String]
    
class TokenManagerState:
    """
    Token manager states
    """
    token_pairs = BoxMapping(abi.Uint16, TokenPairInfo)
    pair_list = BoxList(abi.Uint16, 200) # max 200 pairs
    total_pair_count: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="total pair count",
    )
    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the token manager",
    )
    admin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="admin of the token manager",
    )
    operator: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="operator of the token manager",
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
    "TokenManager", 
    descr="Token manager for cross chain pairs", 
    state=TokenManagerState()
)

###
# API Methods
###
@app.external(authorize=Authorize.only(app.state.owner.get()))
def create_wrapped_token(
    name: abi.String,
    symbol: abi.String,
    decimals: abi.Uint8,
    total_supply: abi.Uint64,
) -> Expr:
    return Seq(
        app.state.latest_wrapped_token_id.set(do_create_wrapped_token(name, symbol, decimals, total_supply)),
        Log(Concat(Bytes("create_wrapped_token:"), Itob(app.state.latest_wrapped_token_id.get()))),
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
        Log(Concat(Bytes("add_token_pair:"), Itob(id.get()))),
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
        Log(Concat(Bytes("update_token_pair:"), Itob(id.get()))),
    )

@app.external
def get_token_pair(
    id: abi.Uint16,
    *,
    output: TokenPairInfo,
) -> Expr:
    return app.state.token_pairs[id].store_into(output)

@app.external(authorize=Authorize.only(app.state.owner.get()))
def transfer_ownership(
    new_owner: abi.Address,
) -> Expr:
    return Seq(
        app.state.owner.set(new_owner.get())
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def set_admin(
    new_admin: abi.Address,
) -> Expr:
    return Seq(
        app.state.admin.set(new_admin.get())
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def set_operator(
    new_operator: abi.Address,
) -> Expr:
    return Seq(
        app.state.operator.set(new_operator.get())
    )
    
@app.external
def get_admin(*, output: abi.Address) -> Expr:
    return output.set(app.state.admin.get())

@app.external
def get_owner(*, output: abi.Address) -> Expr:
    return output.set(app.state.owner.get())

@app.external(authorize=Authorize.only(app.state.admin.get()))
def mint_token(
    asset_id: abi.Uint64,
    user: abi.Address,
    amount: abi.Uint64,
) -> Expr:
    return Seq(
        do_axfer(user.get(), asset_id.get(), amount.get()),
        Log(Concat(Bytes("mint_token:"), Itob(asset_id.get()), Bytes(":"), user.get(), Bytes(":"), Itob(amount.get()))),
    )

@app.external(authorize=Authorize.only(app.state.admin.get()))
def burn_token(
    asset_id: abi.Uint64,
    holder: abi.Address,
    amount: abi.Uint64,
) -> Expr:
    return Seq(
        do_ax_burn(holder.get(), asset_id.get(), amount.get()),
        Log(Concat(Bytes("burn_token:"), Itob(asset_id.get()), Bytes(":"), holder.get(), Bytes(":"), Itob(amount.get()))),
    )
    
##############
# Utility methods for inner transactions
##############

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
    admin: abi.Address,
    operator: abi.Address) -> Expr:
    """Initializes the global state of the app.

    Args:
        owner: address of the owner
        admin: address of the admin
    """
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        Pop(app.state.pair_list.create()),
        app.state.owner.set(owner.get()),
        app.state.admin.set(admin.get()),
        app.state.operator.set(operator.get()),
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
    app.build().export("./artifacts_token_manager")
    print("done")
