
pragma solidity ^0.4.26;

import "../components/BasicStorage.sol";
import "../interfaces/IMetric.sol";
import "./Deposit.sol";
import "./StoremanType.sol";
import "../interfaces/IQuota.sol";
contract StoremanGroupStorage is BasicStorage {
  address public metric;
  IQuota public quotaInst;
  address  public  createGpkAddr;

  StoremanType.StoremanData data;

  constructor() public {

    uint backupCountDefault = 3;
    uint maxSlashedCount = 2;
    uint standaloneWeightDefault = 15000;
    uint chainTypeCoDefault = 10000;
    uint DelegationMultiDefault = 10;
    data.conf.standaloneWeight = standaloneWeightDefault;
    data.conf.backupCount = backupCountDefault;
    data.conf.chainTypeCoDefault = chainTypeCoDefault;
    data.conf.maxSlashedCount = maxSlashedCount;
    data.conf.DelegationMulti = DelegationMultiDefault;
  }
}
