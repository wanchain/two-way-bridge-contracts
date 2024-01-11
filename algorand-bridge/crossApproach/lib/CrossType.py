from pyteal import *
from beaker import *


class CrossTypes:

  class Data:
    # HTLCTxLib.Data htlcTxData;

    rapidityTxData: RapidityTxLib.Data 
    quota: TealType.Address
    tokenManager
    smgAdminProxy
    smgFeeProxy
    sigVerifier
    mapStoremanFee: BoxMapping(TealType.Bytes, TealType.Uint64)
    mapContractFee: BoxMapping(TealType.Uint64, BoxMapping(TealType.Uint64,TealType.Uint64))
    mapAgentFee: BoxMapping(TealType.Uint64, BoxMapping(TealType.Uint64,TealType.Uint64))

  # function transfer(address tokenScAddr, address to, uint value)
  def transfer(tokenScAddr: TealType.Address, to:TealType.Address, value: TealType.Uint64) -> Expr:
    return Reject()

  # function transferFrom(address tokenScAddr, address from, address to, uint value)
  def transferFrom(tokenScAddr: TealType.Address, from: TealType.Address, to:TealType.Address, value: TealType.Uint64) -> Expr:
    return Reject()