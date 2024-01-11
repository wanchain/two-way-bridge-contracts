from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping
from enum import Enum

class RapidityTxLib:

  class TxStatus(Enum):
     None = 0
     Redeemed = 1

  class Data(NamedTuple):
    # mapping(bytes32 => TxStatus) mapTxStatus;
    mapTxStatus: BoxMapping(TealType.bytes, TxStatus)


    def addRapidityTx(self, bytes uniqueID):
      self.mapTxStatus[uniqueID] = TxStatus.None