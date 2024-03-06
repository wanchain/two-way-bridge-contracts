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
def prefixKey(
  prefix: abi.String,
  id: abi.Uint64,
  *,
  output: abi.String
) -> pt.Expr:
  sid = abi.make(abi.String)
  return Seq(
    # sid.set(Itob(id.get())),
    output.set(Concat(prefix.get(), Itob(id.get())))
  )
