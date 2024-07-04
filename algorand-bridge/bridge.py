from typing import Literal
from typing import Final
from pyteal import *
import pyteal as pt
from beaker import *
from beaker.lib.storage import BoxMapping
import schnorr.EcSchnorrVerifier as ec

from bridgelib import *

class StoremanGroupConfig(abi.NamedTuple):
    gpk: abi.Field[abi.StaticBytes[Literal[64]]]
    startTime: abi.Field[abi.Uint64]
    endTime: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint8]
    
class UserLockLogger(abi.NamedTuple):
    name:         abi.Field[abi.String]
    smgID:        abi.Field[abi.StaticBytes[Literal[32]]]
    tokenPairID:  abi.Field[abi.Uint64]
    fromAccount:  abi.Field[abi.Uint64]
    value:        abi.Field[abi.Uint64]
    contractFee:  abi.Field[abi.Uint64]
    userAccount:  abi.Field[abi.String]
    txid:         abi.Field[abi.StaticBytes[Literal[32]]]

class TokenPairLogger(abi.NamedTuple):
    name:           abi.Field[abi.String]
    id:             abi.Field[abi.Uint64]
    fromChainID:    abi.Field[abi.Uint64]
    fromAccount:    abi.Field[abi.DynamicBytes]
    toChainID:      abi.Field[abi.Uint64]
    toAccount:      abi.Field[abi.DynamicBytes]




class SmgReleaseLogger(abi.NamedTuple):
    name:           abi.Field[abi.String]
    uniqueID:       abi.Field[abi.StaticBytes[Literal[32]]]
    smgID:          abi.Field[abi.StaticBytes[Literal[32]]]
    tokenPairID:    abi.Field[abi.Uint64]
    value:          abi.Field[abi.Uint64]
    tokenAccount:   abi.Field[abi.Uint64]
    userAccount:    abi.Field[abi.Address]


class TokenPairInfo(abi.NamedTuple):
    id: abi.Field[abi.Uint64]
    fromChainID: abi.Field[abi.Uint64]
    fromAccount: abi.Field[abi.DynamicBytes]
    toChainID: abi.Field[abi.Uint64]
    toAccount: abi.Field[abi.DynamicBytes]

class CrossTokenInfo(abi.NamedTuple):
    contractFee: abi.Field[abi.Uint64]
    fromAccount: abi.Field[abi.DynamicBytes]
    toAccount: abi.Field[abi.DynamicBytes]

class FeeInfo(abi.NamedTuple):
    contractFee: abi.Field[abi.Uint64]
    agentFee: abi.Field[abi.Uint64]

TransactionHash = abi.StaticBytes[Literal[32]]
CurrentChainID = Int(2147483931)

class BridgeState:
    # Care should be taken to ensure if multiple BoxMapping types are used, there is no overlap with keys. 
    # If there may be overlap, a prefix argument MUST be set in order to provide a unique namespace.
    mapTxStatus = BoxMapping(TransactionHash, abi.Uint8)
    mapTokenPairContractFee = BoxMapping(abi.String, abi.Uint64)
    mapContractFee = BoxMapping(abi.String,abi.Uint64)
    mapAgentFee = BoxMapping(abi.String,abi.Uint64)
    mapAdmin = BoxMapping(abi.String, abi.Uint64)
    mapTokenPairInfo = BoxMapping(abi.String, TokenPairInfo)

    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the bridge",
    )
    updateOwner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner to update the bridge",
    )
    oracleAdmin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="oracle admin",
    )
    feeProxy: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="fee proxy address",
    )
    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )
    halted: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="halted flag",
    )
    mapStoremanGroupConfig = BoxMapping(abi.StaticBytes[Literal[32]], StoremanGroupConfig)


    
app = Application(
    "bridge", 
    descr="Cross chain entry point", 
    state=BridgeState()
)


@app.external(authorize=Authorize.only(app.state.owner.get()))
def addAdmin(
    adminAccount: abi.Address
)   -> Expr:
    adminKey = abi.make(abi.String)
    adminValue = abi.make(abi.Uint64)
    return Seq(
        getAdminKey(adminAccount).store_into(adminKey),
        adminValue.set(Int(1)),
        app.state.mapAdmin[adminKey].set(adminValue)
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def removeAdmin(
    adminAccount: abi.Address
)   -> Expr:
    adminKey = abi.make(abi.String)
    return Seq(
        getAdminKey(adminAccount).store_into(adminKey),
        Pop(app.state.mapAdmin[adminKey].delete())
    )

@Subroutine(TealType.uint64)
def onlyAdmin(acct: Expr):
    adminKey = abi.make(abi.String)
    sender = abi.make(abi.Address)
    return Seq(
        sender.set(acct),
        getAdminKey(sender).store_into(adminKey),
        If(app.state.mapAdmin[adminKey].exists(), Int(1), Int(0))
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def transferOwner(
    _newOwner: abi.Address,
) -> Expr:
    return Seq(
        app.state.owner.set(_newOwner.get())
    )
@app.external(authorize=Authorize.only(app.state.owner.get()))
def transferUpdateOwner(
    _newOwner: abi.Address,
) -> Expr:
    return Seq(
        app.state.updateOwner.set(_newOwner.get())
    )
@app.external(authorize=Authorize.only(app.state.owner.get()))
def transferOracleAdmin(
    _newOracleAdmin: abi.Address,
) -> Expr:
    return Seq(
        app.state.oracleAdmin.set(_newOracleAdmin.get())
    )
@app.external(authorize=Authorize.only(app.state.owner.get()))
def setHalt(_halt: abi.Uint64) -> Expr:
    return Seq(
        app.state.halted.set(_halt.get())
    )

@app.external(authorize=onlyAdmin)
def setTokenPairFee(
    tokenPairID: abi.Uint64,
    contractFee: abi.Uint64,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairFeeKey(tokenPairID).store_into(key),
        app.state.mapTokenPairContractFee[key].set(contractFee),
    )

@app.external(authorize=onlyAdmin)
def setTokenPairFees(
    tokenPairID: abi.DynamicArray[abi.Uint64] ,
    contractFee: abi.DynamicArray[abi.Uint64] ,
) -> Expr:
    i = ScratchVar(TealType.uint64)
    key = abi.make(abi.String)
    id = abi.make(abi.Uint64)
    v = abi.make(abi.Uint64)
    return Seq(
        For(i.store(Int(0)), i.load() < tokenPairID.length(), i.store(i.load() + Int(1))).Do(
            tokenPairID[i.load()].store_into(id),
            getTokenPairFeeKey(id).store_into(key),
            contractFee[i.load()].store_into(v),
            app.state.mapTokenPairContractFee[key].set(v)
        )
    )


@app.external(authorize=onlyAdmin)
def setFee(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    contractFee: abi.Uint64,
    agentFee: abi.Uint64,
) -> Expr:
    KEYc = abi.make(abi.String)
    KEYa = abi.make(abi.String)
    return Seq(
        getContractFeeKey(srcChainID, destChainID).store_into(KEYc),
        getAgentFeeKey(srcChainID, destChainID).store_into(KEYa),
        app.state.mapContractFee[KEYc].set(contractFee),
        app.state.mapAgentFee[KEYa].set(agentFee)
    )

@app.external(authorize=onlyAdmin)
def setFees(
    srcChainID: abi.DynamicArray[abi.Uint64],
    destChainID: abi.DynamicArray[abi.Uint64],
    contractFee: abi.DynamicArray[abi.Uint64],
    agentFee: abi.DynamicArray[abi.Uint64],
) -> Expr:
    KEYc = abi.make(abi.String)
    KEYa = abi.make(abi.String)

    i = ScratchVar(TealType.uint64)
    ksrcChainID = abi.make(abi.Uint64)
    kdestChainID = abi.make(abi.Uint64)
    vcontractFee = abi.make(abi.Uint64)
    vagentFee = abi.make(abi.Uint64)

    return Seq(
        For(i.store(Int(0)), i.load() < contractFee.length(), i.store(i.load() + Int(1))).Do(
            srcChainID[i.load()].store_into(ksrcChainID),
            destChainID[i.load()].store_into(kdestChainID),
            contractFee[i.load()].store_into(vcontractFee),
            agentFee[i.load()].store_into(vagentFee),

            getContractFeeKey(ksrcChainID, kdestChainID).store_into(KEYc),
            app.state.mapContractFee[KEYc].set(vcontractFee),
            getAgentFeeKey(ksrcChainID, kdestChainID).store_into(KEYa),
            app.state.mapAgentFee[KEYa].set(vagentFee)
        )
    )


@ABIReturnSubroutine
def getCrossTokenInfo(
    tokenPairID: abi.Uint64,
    *,
    output: CrossTokenInfo,
    ) -> pt.Expr:
    contractFee = abi.make(abi.Uint64)
    key = abi.make(abi.String)
    (chain0 := abi.make(abi.Uint64)).set(0)
    tInfo = TokenPairInfo()
    toChainID = abi.make(abi.Uint64)
    fromChainID = abi.make(abi.Uint64)
    toAccount = abi.make(abi.DynamicBytes)
    fromAccount = abi.make(abi.DynamicBytes)
    return Seq(
        getTokenPairFeeKey(tokenPairID).store_into(key),
        If(app.state.mapTokenPairContractFee[key].exists())
        .Then(
            app.state.mapTokenPairContractFee[key].store_into(contractFee),
        ).Else(
            contractFee.set(0)
        ),

        getTokenPairInfoKey(tokenPairID).store_into(key),
        app.state.mapTokenPairInfo[key].store_into(tInfo),
        tInfo.toChainID.store_into(toChainID),
        tInfo.fromChainID.store_into(fromChainID),
        If(fromChainID.get() ==  Int(0)).Then(Reject()),
        If(toChainID.get() ==  Int(0)).Then(Reject()),
        If(toChainID.get() ==  CurrentChainID)
        .Then(
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(toChainID, fromChainID).store_into(key),
                app.state.mapContractFee[key].set(contractFee)
            ),
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(toChainID, chain0).store_into(key),
                app.state.mapContractFee[key].set(contractFee)            
            ),
            tInfo.toAccount.store_into(fromAccount),
            tInfo.fromAccount.store_into(toAccount)            
        )
        .ElseIf(fromChainID.get() ==  CurrentChainID)
        .Then(
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(fromChainID, toChainID).store_into(key),
                app.state.mapContractFee[key].set(contractFee)
            ),
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(fromChainID, chain0).store_into(key),
                app.state.mapContractFee[key].set(contractFee)            
            ),
            tInfo.toAccount.store_into(toAccount),
            tInfo.fromAccount.store_into(fromAccount)      
        )
        .Else(
            Reject()
        ),
        output.set(contractFee, fromAccount, toAccount)
    )

     
# function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
@app.external
def userLock(
    smgID: pt.abi.StaticBytes[Literal[32]], 
    tokenPairID: abi.Uint64, 
    userAccount: abi.String,
    value: abi.Uint64, 
    ) -> Expr:
    #     event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, 
    #     address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);

    # if to lock native coin, there are 2 txs.
    # if to lock assert, there are 3 txs, 1: contractFee, 2: assert transfer, 3: sc interface call.
    #   assosiated these 2 txs.  check the value is same in these 2 txs.
    contractFee = abi.make(abi.Uint64)
    toAccount = abi.make(abi.DynamicBytes)
    fromAccount = abi.make(abi.DynamicBytes)
    fromAccountu = abi.make(abi.Uint64)
    crossTokenInfo = CrossTokenInfo()
    left = abi.make(abi.Uint64)
    txid = abi.make(abi.StaticBytes[Literal[32]])
    name = abi.make(abi.String)
    return Seq(
        Assert(app.state.halted.get() == Int(0)),
        getCrossTokenInfo(tokenPairID).store_into(crossTokenInfo),
        crossTokenInfo.contractFee.store_into(contractFee),
        crossTokenInfo.toAccount.store_into(toAccount),
        crossTokenInfo.fromAccount.store_into(fromAccount),

        If(contractFee.get() > Int(0)).Then(
            InnerTxnBuilder.Execute(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: app.state.feeProxy.get(),
                    TxnField.amount: contractFee.get(),
                }
            )
        ),
        If(fromAccount.get() == Itob(Int(0))).Then(
            Assert(Global.group_size() == Int(2)),
            Assert(Txn.group_index() == Int(1)),            
            Assert(pt.Gtxn[0].amount() == contractFee.get() + value.get()),
            txid.set(pt.Gtxn[0].tx_id())
        ).Else(
            Assert(Global.group_size() == Int(3)),
            Assert(Txn.group_index() == Int(2)),            
            Assert(pt.Gtxn[0].amount() == contractFee.get()),
            # check assert tx,  id, to, amount # TODO other fields need check?
            Assert(pt.Gtxn[1].asset_receiver() == Global.current_application_address()),
            Assert(pt.Gtxn[1].xfer_asset() == Btoi(fromAccount.get())),
            Assert(pt.Gtxn[1].asset_amount() == value.get()),
            txid.set(pt.Gtxn[1].tx_id())
        ),
        name.set("UserLockLogger"),
        fromAccountu.set(Btoi(fromAccount.get())),
        (logger := UserLockLogger()).set(name, smgID, tokenPairID, fromAccountu, value, contractFee,  userAccount, txid),
        Log(logger.encode())
    )


# repleace setPartners    
@app.external(authorize=Authorize.only(app.state.owner.get()))
def setSmgFeeProxy(proxy: abi.Address) -> Expr:
    return app.state.feeProxy.set(proxy.get())


# function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s)
# curveID is useless here.
@Subroutine(pt.TealType.uint64)
def verifySignature(mhash, PK, r, s)-> pt.Expr:
    rx = pt.Extract(r, pt.Int(0), pt.Int(32))
    ry = pt.Extract(r, pt.Int(32), pt.Int(32))

    px = pt.Extract(PK, pt.Int(0), pt.Int(32))
    py = pt.Extract(PK, pt.Int(32), pt.Int(32))

    return If(ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)==Int(1), Int(1), Int(0))

@app.external
def acquireReadySmgInfo(
    smgID: abi.StaticBytes[Literal[32]],
    *,
    output: abi.StaticBytes[Literal[64]],
    ) -> pt.Expr:
    info = StoremanGroupConfig()
    startTime = abi.make(abi.Uint64)
    endTime = abi.make(abi.Uint64)
    status =  abi.make(abi.Uint8)
    return Seq(
        app.state.mapStoremanGroupConfig[smgID].store_into(info),
        info.startTime.store_into(startTime),
        info.endTime.store_into(endTime),
        info.status.store_into(status),
        Assert(Global.latest_timestamp() >= startTime.get()),
        Assert(Global.latest_timestamp() < endTime.get()),
        Assert(status.get() == Int(5)),
        output.set(info.gpk)
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
    PK = abi.make(abi.StaticBytes[Literal[64]])
    status = abi.make(abi.Uint8)
    name = abi.make(abi.String)
    feeProxy = abi.make(abi.Address)

    alldata = Concat(Itob(CurrentChainID), uniqueID.get(), 
        Itob(tokenPairID.get()), Itob(value.get()),  Itob(fee.get()), 
        Itob(tokenAccount.get()), userAccount.get())

    mhash = pt.Keccak256(alldata)
    return Seq(
        Assert(app.state.halted.get() == Int(0)),
        name.set("SmgReleaseLogger"),
        (logger := SmgReleaseLogger()).set(name, uniqueID, smgID, tokenPairID, value, tokenAccount,  userAccount),
        Log(logger.encode()),
        If(app.state.mapTxStatus[uniqueID.get()].exists(), Reject()),
        status.set(1),
        app.state.mapTxStatus[uniqueID.get()].set(status),
        acquireReadySmgInfo(smgID).store_into(PK),
        Assert(verifySignature(mhash,  PK.get(), r.get(), s.get()) == Int(1)),
        If(tokenAccount.get() == Int(0)).Then(
            InnerTxnBuilder.Execute(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.sender(),
                    TxnField.amount: value.get(),
                }
            ),
            If(fee.get() > Int(0)).Then(
                feeProxy.set(app.state.feeProxy),
                InnerTxnBuilder.Execute(
                    {
                        TxnField.type_enum: TxnType.Payment,
                        TxnField.receiver: feeProxy.get(),
                        TxnField.amount: fee.get(),
                    }
                )
            )
        ).Else(
            do_axfer(userAccount.get(), tokenAccount.get(), value.get()),
            If(fee.get() > Int(0)).Then(
                feeProxy.set(app.state.feeProxy),
                do_axfer(feeProxy.get(), tokenAccount.get(), fee.get())
            )
        ),
    )


@app.external(authorize=onlyAdmin)
def opt_in_token_id(
    id: abi.Uint64,
) -> Expr:
    return Seq(do_opt_in(id.get()))

@app.external(authorize=Authorize.only(app.state.owner.get()))
def addTokenPair(
    id: abi.Uint64,
    from_chain_id: abi.Uint64,
    from_account: abi.DynamicBytes,
    to_chain_id: abi.Uint64,
    to_account: abi.DynamicBytes,
) -> Expr:
    key = abi.make(abi.String)
    name = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        Assert(app.state.mapTokenPairInfo[key].exists() == Int(0)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account
        ),
        app.state.mapTokenPairInfo[key].set(info),
        name.set("addTokenPair"),
        (logger := TokenPairLogger()).set(name, id, from_chain_id, from_account, to_chain_id, to_account),
        Log(logger.encode())
    )
    
@app.external(authorize=Authorize.only(app.state.owner.get()))
def removeTokenPair(  
    id: abi.Uint64,  
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        Pop(app.state.mapTokenPairInfo[key].delete())
    )

@app.external(authorize=Authorize.only(app.state.owner.get()))
def updateTokenPair(
    id: abi.Uint64,
    from_chain_id: abi.Uint64,
    from_account: abi.DynamicBytes,
    to_chain_id: abi.Uint64,
    to_account: abi.DynamicBytes,
) -> Expr:
    key = abi.make(abi.String)
    name = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        Assert(app.state.mapTokenPairInfo[key].exists() == Int(1)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account,
        ),
        app.state.mapTokenPairInfo[key].set(info),
        name.set("updateTokenPair"),
        (logger := TokenPairLogger()).set(name, id, from_chain_id, from_account, to_chain_id, to_account),
        Log(logger.encode())
    )


@app.external(authorize=Authorize.only(Global.creator_address()))
def initialize(
    owner: abi.Address, 
    updateOwner: abi.Address, 
    admin: abi.Address,
    feeProxy: abi.Address,
    oracleAdmin: abi.Address
    ) -> Expr:
    adminKey = abi.make(abi.String)
    adminValue = abi.make(abi.Uint64)
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        app.state.owner.set(owner.get()),
        app.state.updateOwner.set(updateOwner.get()),
        app.state.oracleAdmin.set(oracleAdmin.get()),
        app.state.feeProxy.set(feeProxy.get()),
        getAdminKey(admin).store_into(adminKey),
        adminValue.set(Int(1)),
        app.state.mapAdmin[adminKey].set(adminValue),
        app.state.initialized.set(Int(1))
    )


@app.update(authorize=Authorize.only(app.state.updateOwner.get()))
def update() -> Expr:
    return Approve()

@app.delete
def delete() -> Expr:
    return Reject()




# oracle methods
@app.external(authorize=Authorize.only(app.state.oracleAdmin.get()))
def setStoremanGroupConfig(
    id: abi.StaticBytes[Literal[32]],
    status: abi.Uint8,
    gpk: abi.StaticBytes[Literal[64]],
    startTime: abi.Uint64,
    endTime: abi.Uint64,
) -> Expr:
    return Seq(
        (info := StoremanGroupConfig()).set(gpk, startTime, endTime, status),
        app.state.mapStoremanGroupConfig[id].set(info),
    )

@app.external(authorize=Authorize.only(app.state.oracleAdmin.get()))
def setStoremanGroupStatus(
    id: abi.StaticBytes[Literal[32]],
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


if __name__ == "__main__":
    app.build().export("./artifacts_cross")
    print("done")
