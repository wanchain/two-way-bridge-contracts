from pyteal import *
from beaker import *
from beaker.lib.storage import BoxMapping
from enum import Enum

class RapidityTxLib:
  # enum TokenCrossType {ERC20, ERC721, ERC1155}
  class TokenCrossType(Enum):
    ERC20 = 0
    ERC721 = 1
    ERC1155 = 2

  class RapidityUserLockParams:
    smgID: TealType.bytes
    tokenPairID: TealType.Uint64
    value: TealType.Uint64
    currentChainID: TealType.Uint64
    tokenPairContractFee: TealType.Uint64
    etherTransferGasLimit: TealType.Uint64
    destUserAccount: TealType.bytes
    smgFeeProxy: TealType.Address

  class RapiditySmgMintParams:
    uniqueID: TealType.bytes
    smgID: TealType.bytes
    tokenPairID: TealType.Uint64
    value: TealType.Uint64
    fee: TealType.Uint64
    destTokenAccount: TealType.Address
    destUserAccount: TealType.Address
    smgFeeProxy: TealType.Address


  class RapidityUserBurnParams:
    smgID: TealType.bytes
    tokenPairID: TealType.Uint64
    value: TealType.Uint64
    currentChainID: TealType.Uint64
    fee: TealType.Uint64
    tokenPairContractFee: TealType.Uint64
    etherTransferGasLimit: TealType.Uint64
    srcTokenAccount: TealType.Address
    destUserAccount: TealType.bytes
    smgFeeProxy: TealType.Address

  class RapiditySmgReleaseParams:
      uniqueID: TealType.bytes
      smgID: TealType.bytes
      tokenPairID: TealType.Uint64
      value: TealType.Uint64
      fee: TealType.Uint64
      etherTransferGasLimit: TealType.Uint64
      destTokenAccount: TealType.Address
      destUserAccount: TealType.Address
      smgFeeProxy: TealType.Address

# function userLock(CrossTypes.Data storage storageData, RapidityUserLockParams memory params)
  def userLock(storageData: CrossTypes.Data, params RapidityUserLockParams) -> Expr:
    return Reject()


# function userBurn(CrossTypes.Data storage storageData, RapidityUserBurnParams memory params)
# function smgMint(CrossTypes.Data storage storageData, RapiditySmgMintParams memory params)
# function smgRelease(CrossTypes.Data storage storageData, RapiditySmgReleaseParams memory params)
# function burnShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {
# function mintShadowToken(ITokenManager tokenManager, address tokenAddress, address userAccount, uint value) private returns (bool) {


