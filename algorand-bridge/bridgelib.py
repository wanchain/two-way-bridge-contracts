from pyteal import *
from beaker import *

@ABIReturnSubroutine
def getFromToChainID(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: abi.Uint64,
    ) -> Expr:
    return  output.set(srcChainID.get()* Int(2**32) + destChainID.get())

@ABIReturnSubroutine
def getTokenPairFeeKey(
    tokenPairID: abi.Uint64,
    *,
    output: abi.String,
    ) -> Expr:
        return output.set(Concat(Bytes("mapTokenPairContractFee"), Itob(tokenPairID.get())))

@ABIReturnSubroutine
def getTokenPairInfoKey(
    tokenPairID: abi.Uint64,
    *,
    output: abi.String,
    ) -> Expr:
        return output.set(Concat(Bytes("mapTokenPairInfo"), Itob(tokenPairID.get())))

@ABIReturnSubroutine
def getAdminKey(
    admin: abi.Address,
    *,
    output: abi.String,
    ) -> Expr:
        return output.set(Concat(Bytes("mapAdmin"), admin.get()))

@ABIReturnSubroutine
def getContractFeeKey(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: abi.String,
    ) -> Expr:
    id = abi.make(abi.Uint64)
    return Seq(
      getFromToChainID(srcChainID, destChainID).store_into(id),
      output.set(Concat(Bytes("mapContractFee"), Itob(id.get())))
    )    

@ABIReturnSubroutine
def getAgentFeeKey(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: abi.String,
    ) -> Expr:
    id = abi.make(abi.Uint64)
    return Seq(
      getFromToChainID(srcChainID, destChainID).store_into(id),
      output.set(Concat(Bytes("mapAgentFee"), Itob(id.get())))
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
def do_opt_in(aid: Expr) -> Expr:
    return do_axfer(Global.current_application_address(), aid, Int(0))

