import typing
from typing import Final
from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping, BoxList

    
TransactionHash = abi.StaticBytes[typing.Literal[32]]

class CrossState:
    """
    Cross chain states
    tx_status: tx -> status
    contract_fees: token_pair_id -> fee
    """
    tx_status = BoxMapping(TransactionHash, abi.Bool)
    contract_fees = BoxMapping(abi.Uint16, abi.Uint64)

    oracle_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="oracle sc of the cross chain",
    )

    token_manager_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="token manager sc of the cross chain",
    )

    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the token manager",
    )
    admin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="admin of the token manager",
    )

    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )

    current_chain_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="current chain id",
    )

    
app = Application(
    "Cross", 
    descr="Cross chain entry point", 
    state=CrossState()
)

###
# API Methods
###

@app.external
def user_lock() -> Expr:
    return Reject()

@app.external
def user_burn() -> Expr:
    return Reject()

@app.external
def smg_mint() -> Expr:
    return Reject()

@app.external
def smg_release() -> Expr:
    return Reject()


##############
# Utility methods for inner transactions
##############

@Subroutine(TealType.none)
def verify_signature(
    hash: Expr,
    sig: Expr,
) -> Expr:
    return Reject()

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
    oracle_id: abi.Uint64,
    token_manager_id: abi.Uint64,
    ) -> Expr:
    """Initializes the global state of the app.

    Args:
        owner: address of the owner
        admin: address of the admin
    """
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        app.state.owner.set(owner.get()),
        app.state.admin.set(admin.get()),
        app.state.oracle_id.set(oracle_id.get()),
        app.state.token_manager_id.set(token_manager_id.get()),
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
    app.build().export("./artifacts_cross")
    print("done")
