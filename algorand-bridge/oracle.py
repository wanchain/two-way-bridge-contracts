from typing import Final
from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping

class StoremanGroupConfig(abi.NamedTuple):
    gpk: abi.Field[abi.String]
    start_time: abi.Field[abi.Uint64]
    end_time: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint8]

class OracleState:
    """
    Oracle sync states of a storeman group
    """
    smgs = BoxMapping(abi.Address, StoremanGroupConfig)
    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the oracle",
    )
    admin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="admin of the oracle",
    )
    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )
        

app = Application(
    "Oracle", 
    descr="Oracle for storeman group", 
    state=OracleState()
)

###
# API Methods
###

@app.external(authorize=Authorize.only(app.state.admin.get()))
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

@app.external(authorize=Authorize.only(app.state.admin.get()))
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
def transfer_admin(
    new_admin: abi.Address,
) -> Expr:
    return Seq(
        app.state.admin.set(new_admin.get())
    )
    
@app.external
def get_admin(*, output: abi.Address) -> Expr:
    return output.set(app.state.admin.get())

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
    admin: abi.Address) -> Expr:
    """Initializes the global state of the app.

    Args:
        owner: address of the owner
        admin: address of the admin
    """
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        app.state.owner.set(owner.get()),
        app.state.admin.set(admin.get()),
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
