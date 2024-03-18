import typing
from typing import Literal

import json
from typing import Final
from pyteal import *
import pyteal as pt
from beaker import *

@ABIReturnSubroutine
def getFromToChainID(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: abi.Uint64,
    ) -> pt.Expr:
    return  output.set(srcChainID.get()* Int(2**32) + destChainID.get())

@ABIReturnSubroutine
def getTokenPairFeeKey(
    tokenPairID: abi.Uint64,
    *,
    output: abi.String,
    ) -> pt.Expr:
        return output.set(Concat(Bytes("mapTokenPairContractFee"), Itob(tokenPairID.get())))

@ABIReturnSubroutine
def getTokenPairInfoKey(
    tokenPairID: abi.Uint64,
    *,
    output: abi.String,
    ) -> pt.Expr:
        return output.set(Concat(Bytes("mapTokenPairInfo"), Itob(tokenPairID.get())))


@ABIReturnSubroutine
def getContractFeeKey(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: abi.String,
    ) -> pt.Expr:
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
    ) -> pt.Expr:
    id = abi.make(abi.Uint64)
    return Seq(
      getFromToChainID(srcChainID, destChainID).store_into(id),
      output.set(Concat(Bytes("mapAgentFee"), Itob(id.get())))
    )        
