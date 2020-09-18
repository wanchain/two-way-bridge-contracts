
pragma solidity 0.4.26;

interface IQuota {
  function userMintLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userMintRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userMintRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgMintLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgMintRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgMintRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function userBurnLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userBurnRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userBurnRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgBurnLock(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgBurnRevoke(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgBurnRedeem(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function userFastMint(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function userFastBurn(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function smgFastMint(uint tokenId, bytes32 storemanGroupId, uint value) external;
  function smgFastBurn(uint tokenId, bytes32 storemanGroupId, uint value) external;

  function assetLock(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function assetRedeem(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function assetRevoke(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;

  function debtLock(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function debtRedeem(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;
  function debtRevoke(bytes32 srcStoremanGroupId, bytes32 dstStoremanGroupId) external;

  function getUserMintQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);
  function getSmgMintQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);

  function getUserBurnQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);
  function getSmgBurnQuota(uint tokenId, bytes32 storemanGroupId) external view returns (uint);

  function getAsset(uint tokenId, bytes32 storemanGroupId) external view returns (uint asset, uint asset_receivable, uint asset_payable);
  function getDebt(uint tokenId, bytes32 storemanGroupId) external view returns (uint debt, uint debt_receivable, uint debt_payable);

  function isDebtClean(bytes32 storemanGroupId) external view returns (bool);
}
