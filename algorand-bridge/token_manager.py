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
    pair_list = BoxList(abi.Uint16, 200) # max 1000 pairs
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

    
app = Application(
    "TokenManager", 
    descr="Token manager for cross chain pairs", 
    state=TokenManagerState()
)

###
# API Methods
###
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

    

@Subroutine(TealType.none)
def do_axfer(rx: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_receiver: rx,
            TxnField.fee: Int(0),
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
                TxnField.fee: Int(0),
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
