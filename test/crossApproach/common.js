const ADDRESS_0                   = "0x0000000000000000000000000000000000000000";
const ADDRESS_1    = '0x0000000000000000000000000000000000000001';

const userBTCAccount              = "1KpKz7JaMgV67C6uDBsWVjzbM2CHRBXXph";

const htlcLockedTime              = 40; //unit: s
const quotaDepositRate            = 15000;
const ERROR_INFO                  = 'it should be throw error';

const uniqueInfo         = {
  userLockWAN:           '0x0000000000000000000000000000000000000000000000000000000000000001',
  userReleaseWAN:        '0x0000000000000000000000000000000000000000000000000000000000000002',
  userLockFNX:           '0x0000000000000000000000000000000000000000000000000000000000000003',
  userReleaseFNX:        '0x0000000000000000000000000000000000000000000000000000000000000004',
  userLockETH:           '0x0000000000000000000000000000000000000000000000000000000000000005',
  userReleaseETH:        '0x0000000000000000000000000000000000000000000000000000000000000006',
  userLockLink:          '0x0000000000000000000000000000000000000000000000000000000000000007',
  userReleaseLink:       '0x0000000000000000000000000000000000000000000000000000000000000008',
  userLockWanBTC:        '0x0000000000000000000000000000000000000000000000000000000000000009',
  userLockEthBTC:        '0x000000000000000000000000000000000000000000000000000000000000000a',
  userReleaseWanBTC:     '0x000000000000000000000000000000000000000000000000000000000000000b',
  userReleaseEthBTC:     '0x000000000000000000000000000000000000000000000000000000000000000c',
  userLockWan2EthBTC:    '0x000000000000000000000000000000000000000000000000000000000000000d',
  userLockEth2WanBTC:    '0x000000000000000000000000000000000000000000000000000000000000000e',
  userReleaseWan2EthBTC: '0x000000000000000000000000000000000000000000000000000000000000000f',
  userReleaseEth2WanBTC: '0x0000000000000000000000000000000000000000000000000000000000000010',
  userDebtLockWAN:       '0x0000000000000000000000000000000000000000000000000000000000000011',
  userDebtReleaseWAN:    '0x0000000000000000000000000000000000000000000000000000000000000012',
  wanAssetDebt:          '0x00000000000000000000000000000000000000000000000000000000000000f1',
  ethAssetDebt:          '0x00000000000000000000000000000000000000000000000000000000000000f2',
  userLockTnT:           '0x00000000000000000000000000000000000000000000000000000000000000f7',
  userReleaseTnT:        '0x00000000000000000000000000000000000000000000000000000000000000f8',

  userLockNFT:           '0x00000000000000000000000000000000000000000000000000000000000000f9',
  userReleaseNFT:        '0x00000000000000000000000000000000000000000000000000000000000000fa',

  userLockErc1155:       '0x00000000000000000000000000000000000000000000000000000000000000fb',
  userReleaseErc1155:    '0x00000000000000000000000000000000000000000000000000000000000000fc',
  fastException:         '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
};

// const skInfo             = [
//   {
//     WAN     : new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex'),
//     ETH     : new Buffer("e6a00fb13723260102a6937fc86b0552eac9abbe67240d7147f31fdef151e18a", 'hex'),
//   },
//   {
//     WAN     : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
//     ETH     : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
//   },
//   // srcSmg  : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
//   // srcSmg1 : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
//   // dstSmg  : new Buffer("b3ba835eae481e6af0219a9cda3769622eea512aacfb7ea4eb0e9426ff800dc5", 'hex')
// ];

let chainTypes = {
  WAN: "WAN",
  ETH: "ETH",
  ETC: "ETC",
  BTC: "BTC",
}

let defaultChainIDs    = {
  WAN                    : 0x8057414e,
  ETH                    : 0x8000003c,
  ETC                    : 0x8000003d,
  BTC                    : 0x80000000,
  all                    : 0xffffffff,
};

let defaultChainID2Types = {}
Object.keys(defaultChainIDs).forEach(chainType => defaultChainID2Types[defaultChainIDs[chainType]] = chainType);

let defaultCurve         = {
  secp256k1                : 0,
  bn128                    : 1,
  ecSchnorr                : 2,
};

let defaultCurve2Schnorr = {};
Object.keys(defaultCurve).forEach(curveType => defaultCurve2Schnorr[defaultCurve[curveType]] = curveType);

let crossFees            = {
  WAN: {
    WAN: {
      ETH: {lockFee:10, revokeFee: 10},
      BTC: {lockFee:15, revokeFee: 25},
    },
    ETH: {
      WAN: {lockFee:15, revokeFee: 10},
    },
    BTC: {
      WAN: {lockFee:20, revokeFee: 25},
    }
  },
  ETH: {
    ETH: {
      WAN: {lockFee:10, revokeFee: 15},
      BTC: {lockFee:15, revokeFee: 20},
    },
    WAN: {
      ETH: {lockFee:20, revokeFee: 35},
    },
    BTC: {
      ETH: {lockFee:15, revokeFee: 20},
    }
  },
  BTC:  {
    BTC: {
      WAN: {lockFee:10, revokeFee: 40},
      ETH: {lockFee:25, revokeFee: 40},
    },
    WAN: {
      BTC: {lockFee:45, revokeFee: 20},
    },
    ETH: {
      BTC: {lockFee:45, revokeFee: 20},
    }
  }
};

let crossFeesV2 = {
  WAN: {
    ETH: {
      contractFee: 20,
      agentFee: 0,
    },
    BTC: {
      contractFee: 0,
      agentFee: 30
    },
  },
  ETH: {
    WAN: {
      contractFee: 5,
      agentFee: 0,
    },
    BTC: {
      contractFee: 0,
      agentFee: 15
    },
  },
};

let crossFeesV3 = {
  WAN: {
    ETH: {
      contractFee: 20,
      agentFee: 10,
    },
    BTC: {
      contractFee: 0,
      agentFee: 30
    },
  },
  ETH: {
    WAN: {
      contractFee: 5,
      agentFee: 10,
    },
    BTC: {
      contractFee: 0,
      agentFee: 15
    },
  },
};

module.exports = {
  ADDRESS_0,
  ADDRESS_1,
  htlcLockedTime,
  ERROR_INFO,
  quotaDepositRate,
  uniqueInfo,
  chainTypes,
  defaultChainIDs,
  defaultChainID2Types,
  defaultCurve,
  defaultCurve2Schnorr,
  crossFees,
  crossFeesV2,
  crossFeesV3,
  userBTCAccount
}