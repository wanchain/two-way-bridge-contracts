from typing import Literal
from typing import Final
from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping

import bridge
import schnorr.EcSchnorrVerifier as ec


TypeAddAdmin = Int(1)
TypeRemoveAdmin = Int(2)
TypeTransferOwner = Int(3)
TypeSetHalt = Int(4)
TypeSetSmgFeeProxy = Int(5)
TypeAddTokenPair = Int(6)
TypeRemoveTokenPair = Int(7)
TypeUpdateTokenPair = Int(8)
TypeTransferFoundation = Int(9)
TypeTransferUpdateOwner = Int(10)
TypeTransferOracleAdmin = Int(11)
TypeMax = Int(12)

class Task(abi.NamedTuple):
    to: abi.Field[abi.Uint64]
    proposalType: abi.Field[abi.Uint64]
    data:  abi.Field[abi.DynamicBytes]
    executed: abi.Field[abi.Bool]

class ApprovedAndExecuted(abi.NamedTuple):
    name:         abi.Field[abi.String]
    smgID:        abi.Field[abi.StaticBytes[Literal[32]]]
    to:           abi.Field[abi.Uint64]
    proposalId:   abi.Field[abi.Uint64]
    data:         abi.Field[abi.DynamicBytes]


@ABIReturnSubroutine
def getProposalKey(
    proposalId: abi.Uint64,
    *,
    output: abi.String,
    ) -> Expr:
        return output.set(Concat(Bytes("mapTask"), Itob(proposalId.get())))


class GroupApproveState:
    # Care should be taken to ensure if multiple BoxMapping types are used, there is no overlap with keys. 
    # If there may be overlap, a prefix argument MUST be set in order to provide a unique namespace.
    foundation: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="foundation of the groupApprove",
    )
    bridge: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="bridge app id",
    )
    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )

    taskCount: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="task count",
    )
    mapTask = BoxMapping(abi.String, Task)


CurrentChainID = Int(2147483931)
app = Application(
    "groupApprove", 
    descr="groupApprove entry point",
    state=GroupApproveState()
)



@ABIReturnSubroutine
def transferFoundation(
    _newFoundation: abi.Address,
) -> Expr:
    return Seq(
        app.state.foundation.set(_newFoundation.get()),
        Log(_newFoundation.get())
    )

@app.external
def _acquireReadySmgInfo(
    smgID: abi.StaticBytes[Literal[32]],
    *,
    output: abi.StaticBytes[Literal[64]],
    ) -> Expr:
    return Seq(
        InnerTxnBuilder.ExecuteMethodCall(
            app_id=app.state.bridge.get(),
            method_signature=bridge.acquireReadySmgInfo.method_signature(),
            args=[smgID],
        ),
        output.set(Extract(InnerTxn.last_log(), Int(4), Int(64)))
    )


@app.external(authorize=Authorize.only(app.state.foundation.get()))
def proposal(
  _chainId: abi.Uint64,
  _to: abi.Uint64,
  _proposalType: abi.Uint64,
  _data: abi.DynamicBytes
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        Assert(_chainId.get() == CurrentChainID),
        Assert(_proposalType.get() > Int(0)),
        Assert(_proposalType.get() < TypeMax),
        (status := abi.Bool()).set(False),
        (proposalId := abi.Uint64()).set(app.state.taskCount.get()),
        getProposalKey(proposalId).store_into(key),
        (task := Task()).set(_to, _proposalType, _data, status),
        app.state.mapTask[key].set(task),
        app.state.taskCount.set(app.state.taskCount.get()+Int(1)),
    )




@Subroutine(TealType.uint64)
def verifySignature(mhash, PK, r, s)-> Expr:
    rx = Extract(r, Int(0), Int(32))
    ry = Extract(r, Int(32), Int(32))

    px = Extract(PK, Int(0), Int(32))
    py = Extract(PK, Int(32), Int(32))

    return ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)


@app.external
def approveAndExecute(
    proposalId: abi.Uint64, 
    smgID: abi.StaticBytes[Literal[32]], 
    r: abi.StaticBytes[Literal[64]], 
    s: abi.StaticBytes[Literal[32]]) -> Expr:
    PK = abi.make(abi.StaticBytes[Literal[64]])
    key = abi.make(abi.String)

    sigHash = Keccak256(Concat(Itob(proposalId.get()),Itob(CurrentChainID)))
    protype = abi.make(abi.Uint64)
    data = abi.make(abi.DynamicBytes)
    addr = abi.make(abi.Address)
    number = abi.make(abi.Uint64)
    to = abi.make(abi.Uint64)
    name = abi.make(abi.String)
    method_signature = ""
    return  Seq(
        _acquireReadySmgInfo(smgID).store_into(PK),
        Assert(verifySignature(sigHash,  PK.get(), r.get(), s.get()) == Int(1)),
        getProposalKey(proposalId).store_into(key),
        (task := Task()).decode(app.state.mapTask[key].get()),
        task.executed.store_into(eflag:=abi.Bool()),
        Assert(eflag.get() == Int(0)),
        
        task.proposalType.store_into(protype),
        task.data.store_into(data),
        task.to.store_into(to),
        name.set("ApprovedAndExecuted"),
        (logger := ApprovedAndExecuted()).set(name, smgID, to, proposalId,  data),
        Log(logger.encode()),        
        Cond(
            [protype.get() == TypeAddAdmin, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.addAdmin.method_signature(),
                    args=[addr],
                ),                  
            )],
            [protype.get() == TypeRemoveAdmin, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.removeAdmin.method_signature(),
                    args=[addr],
                ),                  
            )],     
            [protype.get() == TypeTransferOwner, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.transferOwner.method_signature(),
                    args=[addr],
                ),                  
            )],                   
            [protype.get() == TypeSetHalt, Seq(
                (number:= abi.Uint64()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.setHalt.method_signature(),
                    args=[number],
                ),                  
            )],
            [protype.get() == TypeSetSmgFeeProxy, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.setSmgFeeProxy.method_signature(),
                    args=[addr],
                ),                  
            )],            
            [protype.get() == TypeRemoveTokenPair, Seq(
                (number:= abi.Uint64()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.removeTokenPair.method_signature(),
                    args=[number],
                ),                  
            )],       
            [protype.get() == TypeAddTokenPair, Seq(
                (pInfo:= bridge.TokenPairInfo()).decode(data.get()),
                pInfo.id.store_into((id:=abi.Uint64())),
                pInfo.fromChainID.store_into((fromChainID:=abi.Uint64())),
                pInfo.fromAccount.store_into((fromAccount:=abi.DynamicBytes())),
                pInfo.toChainID.store_into((toChainID:=abi.Uint64())),
                pInfo.toAccount.store_into((toAccount:=abi.DynamicBytes())),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.addTokenPair.method_signature(),
                    args=[id, fromChainID,fromAccount,toChainID,toAccount],
                ),                  
            )],   
            [protype.get() == TypeUpdateTokenPair, Seq(
                (pInfo:= bridge.TokenPairInfo()).decode(data.get()),
                pInfo.id.store_into((id:=abi.Uint64())),
                pInfo.fromChainID.store_into((fromChainID:=abi.Uint64())),
                pInfo.fromAccount.store_into((fromAccount:=abi.DynamicBytes())),
                pInfo.toChainID.store_into((toChainID:=abi.Uint64())),
                pInfo.toAccount.store_into((toAccount:=abi.DynamicBytes())),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.updateTokenPair.method_signature(),
                    args=[id, fromChainID,fromAccount,toChainID,toAccount],
                ),                  
            )],
            [protype.get() == TypeTransferFoundation, Seq(
                (addr:= abi.Address()).decode(data.get()),
                Assert(to.get() == Txn.application_id()),
                transferFoundation(addr)
            )],    
            [protype.get() == TypeTransferUpdateOwner, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.transferUpdateOwner.method_signature(),
                    args=[addr],
                ),                  
            )],
            [protype.get() == TypeTransferOracleAdmin, Seq(
                (addr:= abi.Address()).decode(data.get()),
                InnerTxnBuilder.ExecuteMethodCall(
                    app_id=to.get(),
                    method_signature=bridge.transferOracleAdmin.method_signature(),
                    args=[addr],
                ),                  
            )],
        ),
        eflag.set(True),
        (taskn := Task()).set(to, protype, data, eflag),
        app.state.mapTask[key].set(taskn),
    )


@app.external(authorize=Authorize.only(Global.creator_address()))
def initialize(
    foundation: abi.Address, 
    bridge: abi.Uint64,
    ) -> Expr:
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        app.state.foundation.set(foundation.get()),
        app.state.bridge.set(bridge.get()),
        app.state.initialized.set(Int(1))
    )


@app.update
def update() -> Expr:
    return Reject()

@app.delete
def delete() -> Expr:
    return Reject()




if __name__ == "__main__":
    app.build().export("./artifacts_groupApprove")
    print("done")
