from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping
from enum import Enum

class EtherTransfer:
  # sendValue(address payable recipient, uint256 amount, uint256 gasLimit)
  def sendValue(recipient: abi.Address, amount: abi.Uint64, gasLimit: abi.Uint64):
    assert()
