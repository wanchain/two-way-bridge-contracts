import typing
from typing import Literal

import json
from typing import Final
from pyteal import *
import pyteal as pt
from beaker import *
from beaker.lib.storage import BoxMapping, BoxList
import schnorr.EcSchnorrVerifier as ec

class StoremanGroupConfig(abi.NamedTuple):
    gpk: abi.Field[abi.StaticBytes[typing.Literal[64]]]
    startTime: abi.Field[abi.Uint64]
    endTime: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint8]
    
TransactionHash = abi.StaticBytes[typing.Literal[32]]

class CrossState:
    """
    Cross chain states
    tx_status: tx -> status
    contract_fees: token_pair_id -> fee
    """
    tx_status = BoxMapping(TransactionHash, abi.Bool)
    contract_fees = BoxMapping(abi.Uint16, abi.Uint64)
    mapTokenPairContractFee = BoxMapping(abi.Uint16, abi.Uint64)

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

    currentChainID: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="current chain id",
    )
    
    maxBatchSize: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="current chain id",
    )
    etherTransferGasLimit: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="current chain id",
    )
    hashType: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="current chain id",
    )
    latest_wrapped_token_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="latest wrapped token id",
    )
    # lockedTime: depercated. only for HTLC
    # smgFeeReceiverTimeout: useless
    ## oracle
    mapStoremanGroupConfig = BoxMapping(abi.StaticBytes[Literal[32]], StoremanGroupConfig)
    TTTmapStoremanGroupConfig = BoxMapping(abi.StaticBytes[Literal[32]], abi.StaticBytes[typing.Literal[64]])


    
app = Application(
    "CrossDelegateV4", 
    descr="Cross chain entry point", 
    state=CrossState()
)

###
# API Methods
###

@app.external
def setAdmin(
    adminAccount: abi.Address
)   -> Expr:
    return app.state.admin.set(adminAccount.get())

@app.external
def admin(
    *,
    output: abi.Address
)    -> Expr:
    return output.set(app.state.admin.get())

@app.external
def setMaxBatchSize(
    _maxBatchSize: abi.Uint64
)   -> Expr:
    return app.state.maxBatchSize.set(_maxBatchSize.get())

@app.external
def getMaxBatchSize(
    *,
    output: abi.Uint64
)    -> Expr:
    return output.set(app.state.maxBatchSize.get())

@app.external
def setHashType(
    _hashType: abi.Uint64
)   -> Expr:
    return app.state.hashType.set(_hashType.get())

@app.external
def hashType(
    *,
    output: abi.Uint64
)    -> Expr:
    return output.set(app.state.hashType.get())

@app.external
def setEtherTransferGasLimit(
    _etherTransferGasLimit: abi.Uint64
)   -> Expr:
    return app.state.etherTransferGasLimit.set(_etherTransferGasLimit.get())

@app.external
def getEtherTransferGasLimit(
    *,
    output: abi.Uint64
)    -> Expr:
    return output.set(app.state.etherTransferGasLimit.get())


@app.external
def setChainID(
    chainID: abi.Uint64
)   -> Expr:
    return app.state.currentChainID.set(chainID.get())

@app.external
def currentChainID(
    *,
    output: abi.Uint64
)    -> Expr:
    return output.set(app.state.currentChainID.get())

@app.external(read_only=True)
def getTokenPairFee(
    tokenPairID: abi.Uint16,
    *,
    output: abi.Uint64,
) -> Expr:
    return app.state.mapTokenPairContractFee[tokenPairID].store_into(output)

@app.external
def setTokenPairFee(
    tokenPairID: abi.Uint16,
    contractFee: abi.Uint64,
) -> Expr:
    return Seq(
        app.state.mapTokenPairContractFee[tokenPairID].set(contractFee),
    )

# function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
@app.external
def userLock(
    # seed: abi.PaymentTransaction, 
    smgID: pt.abi.StaticBytes[Literal[32]], 
    tokenPairID: abi.Uint64, 
    userAccount: abi.String,
    value: abi.Uint64, 
    ) -> Expr:
    #     event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, 
    #     address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);

#   assosiated these 2 txs.  check the value is same in these 2 txs.

    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    userAccount = userAccount.get()
    UserLockLogger = Concat(
        Bytes("UserLockLogger:"), 
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Bytes("this_is_tokenAccount"), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(Int(88888888888)), Bytes(":"),
        userAccount, Bytes(":"),
        pt.Gtxn[0].tx_id()
    )
    


    return Seq(
        Assert(Global.group_size() == Int(2)),
        #Log(json.dumps(UserLockLogger))
        Log(UserLockLogger)
    )

# @app.external
# def testGet(*, output: abi.String) -> Expr:
#     epx = pt.Bytes("base16", "8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104")

#     (info := StoremanGroupConfig()).decode(
#         app.state.mapStoremanGroupConfig[smgID].get()
#     )
#     (gpk := abi.StaticBytes(abi.StaticBytesTypeSpec(64))).set(info.gpk),

#     PK = gpk.get()

#     # px = pt.Extract(PK, pt.Int(0), pt.Int(32))
#     # py = pt.Extract(PK, pt.Int(32), pt.Int(32))
#     # return Seq(
#     #     Assert(pt.BytesEq(px, epx)),
#     #     PK
#     # )
#     return output.set(PK)
#     # return output.set(app.state.currentChainID.get())

# function getSmgFeeProxy() internal view returns (address)
# @Subroutine(TealType.uint64)
def getSmgFeeProxy() -> Expr:
    return 200

# userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount)
@app.external
def userBurn(
    # seed: abi.AssetTransferTransaction, 
    smgID: pt.abi.StaticBytes[Literal[32]], 
    tokenPairID: abi.Uint64, 
    value: abi.Uint64,
    fee: abi.Uint64,  
    tokenAccount: abi.Uint64,  
    userAccount: abi.String) -> Expr:
    #     event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, 
    #   address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);

    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()

    UserBurnLogger = Concat(
        Bytes("UserBurnLogger:"),
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(Int(88888888888)), Bytes(":"),
        Itob(Int(999)), Bytes(":"),
        userAccount, Bytes(":")
    )

    return Seq(
        Log(UserBurnLogger)
    )

# function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s)
# curveID is useless here.
@Subroutine(pt.TealType.uint64)
def verifySignature(mhash, PK, r, s)-> pt.Expr:
    rx = pt.Extract(r, pt.Int(0), pt.Int(32))
    ry = pt.Extract(r, pt.Int(32), pt.Int(32))

    px = pt.Extract(PK, pt.Int(0), pt.Int(32))
    py = pt.Extract(PK, pt.Int(32), pt.Int(32))


    # ecResult = ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)
    return If(ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)==Int(1), Int(1), Int(0))

@Subroutine(pt.TealType.bytes)
def acquireReadySmgInfo(
    smgID,
    ) -> pt.Expr:

    # TPK= Bytes("base16", "8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5")
    # return TPK
    return app.state.TTTmapStoremanGroupConfig[smgID].get()

    # (info := StoremanGroupConfig()).decode(
    #     app.state.mapStoremanGroupConfig[smgID].get()
    # )
    # gpk = abi.StaticBytes(abi.StaticBytesTypeSpec(64))
    # info.gpk.store_into(gpk)
    # gpk.decode(gpk.get())
    # # info.gpk.store_into(gpk)
    # return gpk.get()

# function smgMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)   
@app.external
def smgMint(
        uniqueID:pt.abi.StaticBytes[Literal[32]], 
        smgID:pt.abi.StaticBytes[Literal[32]],
        tokenPairID:abi.Uint64, value:abi.Uint64,
        fee: abi.Uint64, tokenAccount:abi.Uint64, 
        userAccount:abi.Address, 
        r:pt.abi.StaticBytes[Literal[64]], 
        s:pt.abi.StaticBytes[Literal[32]]) -> Expr:
    #    event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    uniqueID = uniqueID.get()
    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()

    SmgMintLogger = Concat(
        Bytes("SmgMintLogger:"),
        uniqueID, Bytes(":"),
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        userAccount, Bytes(":")
    )
    PK = acquireReadySmgInfo(smgID)

    currentChainID = Int(2147483931)
    r = r.get()
    s = s.get()
    alldata = Concat(Itob(currentChainID), uniqueID, 
        Itob(tokenPairID), Itob(value),  Itob(fee), 
        Itob(tokenAccount), userAccount)
    mhash = pt.Keccak256(alldata)
    verifyResult = verifySignature(mhash, PK, r, s)

    return Seq(
        Log(SmgMintLogger),
        # Assert(verifyResult == Int(1)),   # TODO check the signature. here for test.
        do_axfer(userAccount, tokenAccount, value)
    )




# smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
@app.external
def smgRelease(
        uniqueID: pt.abi.StaticBytes[Literal[32]], 
        smgID: pt.abi.StaticBytes[Literal[32]], 
        tokenPairID: abi.Uint64, 
        value: abi.Uint64, fee: abi.Uint64, 
        tokenAccount: abi.Uint64, 
        userAccount: abi.Address, 
        r: abi.StaticBytes[Literal[64]], 
        s: abi.StaticBytes[Literal[32]]) -> Expr:
    #    event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    uniqueID = uniqueID.get()
    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()

    SmgReleaseLogger = Concat(Bytes("SmgReleaseLogger:"),
        uniqueID, Bytes(":"),
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        userAccount
    )
    OpUp(mode=pt.OpUpMode.OnCall).ensure_budget(Int(9000),fee_source=pt.OpUpFeeSource.GroupCredit),
    PK = acquireReadySmgInfo(smgID)
    currentChainID = Int(2147483931)
    r = r.get()
    s = s.get()
    alldata = Concat(Itob(currentChainID), uniqueID, 
        Itob(tokenPairID), Itob(value),  Itob(fee), 
        Itob(tokenAccount), userAccount)
    mhash = pt.Keccak256(alldata)

    px = pt.Extract(PK, pt.Int(0), pt.Int(32))

    verifyResult = verifySignature(mhash, PK, r, s)

    return Seq(
        Log(SmgReleaseLogger),
        Assert(verifyResult == Int(1)),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: Txn.sender(),
                TxnField.amount: Int(111112),
            }
        )
    )

@app.external
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
                TxnField.config_asset_url: Bytes("https://bridge.wanchain.org"),
                TxnField.fee: Int(1000),
            }
        ),
        InnerTxn.created_asset_id(),
    )


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
    # seed: abi.PaymentTransaction, # pay for minimum balance
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



# oracle methods
@app.external
def set_storeman_group_config(
    id: abi.StaticBytes[typing.Literal[32]],
    gpk: abi.StaticBytes[typing.Literal[64]],
    startTime: abi.Uint64,
    endTime: abi.Uint64,
) -> Expr:
    return Seq(
        (status := abi.Uint8()).set(Int(0)),
        (info := StoremanGroupConfig()).set(gpk, startTime, endTime, status),
        app.state.mapStoremanGroupConfig[id].set(info),
        app.state.TTTmapStoremanGroupConfig[id].set(gpk.get())
        
    )

@app.external
def set_storeman_group_status(
    id: abi.StaticBytes[typing.Literal[32]],
    status: abi.Uint8,
) -> Expr:

    return Seq(
        (info := StoremanGroupConfig()).decode(
            app.state.mapStoremanGroupConfig[id].get()
        ),
        (gpk := abi.StaticBytes(abi.StaticBytesTypeSpec(64))).set(info.gpk),
        (startTime := abi.Uint64()).set(info.startTime),
        (endTime := abi.Uint64()).set(info.endTime),
        (infoNew := StoremanGroupConfig()).set(gpk, startTime, endTime, status),
        app.state.mapStoremanGroupConfig[id].set(infoNew)
    )



@app.external
def get_smg_info(
    id: abi.StaticBytes[typing.Literal[32]],
    *,
    output: StoremanGroupConfig,
) -> Expr:
    return app.state.mapStoremanGroupConfig[id].store_into(output)


if __name__ == "__main__":
    app.build().export("./artifacts_cross")
    print("done")
