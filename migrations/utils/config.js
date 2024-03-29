const chainDict = {
  WAN: "WAN",
  ETH: "ETH",
  ETC: "ETC",
  EOS: "EOS",
  BSC: "BSC",
  AVAX: "AVAX",
  TEST: "TEST",
  MOVR: "MOVR",
  MOONBEAM: "MOONBEAM",
  MATIC: "MATIC",
  ADA: "ADA",
  ARB: "ARB",
  OPM: "OPM",
  FTM: "FTM",
  XDC: "XDC",
  OKT: "OKT",
  CLV: "CLV",
};

const operationDict = {
  ...chainDict,
  MODEL: "MODEL",
}

const chainIndexDict = {
  WAN: 0x57414e,
  ETH: 0x3c,
  ETC: 0x3d,
  EOS: 0xc2,
  BSC: 0x2ca,
  AVAX: 0x2328,
  MOVR: 0x3ffffffc, // TODO: NEED UPDATE,
  MOONBEAM: 0x3ffffffc, // TODO: NEED UPDATE,
  MATIC: 0x3c6,
  ADA: 0x2331,// TODO: NEED UPDATE,
  ARB: 0x2332, // TODO: NEED UPDATE,
  OPM: 0xa,
  FTM: 0xb,
  XDC: 0x226,
  OKT: 0x3e4,
  CLV:0x2335, // TODO: NEED UPDATE,
};

const chainNature = {
  system: {id:1},
  custom: {id:2, network: "customNetwork"},
};

const networkInfo = [
  // WAN
  // {name:"mainnet", chainId: 1, chainType: chainDict.WAN, chainIndex:chainIndexDict.WAN, isMainnet: true, nature: chainNature.system.id}, // Txtype = 0x01;
  // {name:"testnet", chainId: 3, chainType: chainDict.WAN, chainIndex:chainIndexDict.WAN, isMainnet: false, nature: chainNature.custom.id}, // Txtype = 0x01;
  {name:"mainnet", chainId: 888, chainType: chainDict.WAN, chainIndex:chainIndexDict.WAN, isMainnet: true, nature: chainNature.system.id},
  {name:"testnet", chainId: 999, chainType: chainDict.WAN, chainIndex:chainIndexDict.WAN, isMainnet: false, nature: chainNature.custom.id},
  // ETH
  {name:"ethereum", chainId: 1, chainType: chainDict.ETH, chainIndex:chainIndexDict.ETH, isMainnet: true, nature: chainNature.system.id},
  {name:"ropsten", chainId: 3, chainType: chainDict.ETH, chainIndex:chainIndexDict.ETH, nature: chainNature.system.id},
  {name:"rinkeby", chainId: 4,chainType: chainDict.ETH, chainIndex:chainIndexDict.ETH, isMainnet: false, nature: chainNature.system.id},
  {name:"goerli", chainId: 5, chainType: chainDict.ETH, chainIndex:chainIndexDict.ETH, nature: chainNature.custom.id},
  {name:"kovan", chainId: 42, chainType: chainDict.ETH, chainIndex:chainIndexDict.ETH, nature: chainNature.system.id},

  // BSC
  {name:"bscMainnet", chainId: 56,chainType: chainDict.BSC, chainIndex:chainIndexDict.BSC, isMainnet: true, nature: chainNature.system.id},
  {name:"bscTestnet", chainId: 97,chainType: chainDict.BSC, chainIndex:chainIndexDict.BSC, isMainnet: false, nature: chainNature.system.id},

  // Avalanche
  {name:"avalancheMainnet", chainId: 43114,chainType: chainDict.AVAX, chainIndex:chainIndexDict.AVAX, isMainnet: true, nature: chainNature.system.id},
  {name:"avalancheTestnet", chainId: 43113,chainType: chainDict.AVAX, chainIndex:chainIndexDict.AVAX, isMainnet: false, nature: chainNature.custom.id},

  // Moonbeam
  {name:"moonbeamMainnet", chainId: 1284,chainType: chainDict.MOONBEAM, chainIndex:chainIndexDict.MOONBEAM, isMainnet: true, nature: chainNature.custom.id},
  {name:"moonbeamTestnet", chainId: 1287,chainType: chainDict.MOONBEAM, chainIndex:chainIndexDict.MOONBEAM, isMainnet: false, nature: chainNature.custom.id},

  // Moonriver
  {name:"moonriverMainnet", chainId: 1285,chainType: chainDict.MOVR, chainIndex:chainIndexDict.MOVR, isMainnet: true, nature: chainNature.custom.id},
  {name:"moonriverTestnet", chainId: 1287,chainType: chainDict.MOVR, chainIndex:chainIndexDict.MOVR, isMainnet: false, nature: chainNature.custom.id},

  // Polygon
  {name:"maticMainnet", chainId: 137,chainType: chainDict.MATIC, chainIndex:chainIndexDict.MATIC, isMainnet: true, nature: chainNature.system.id},
  {name:"maticTestnet", chainId: 80001,chainType: chainDict.MATIC, chainIndex:chainIndexDict.MATIC, isMainnet: false, nature: chainNature.system.id},

  // Cardano
  {name:"adaMainnet", chainId: 103,chainType: chainDict.ADA, chainIndex:chainIndexDict.ADA,nature: chainNature.system.id},
  {name:"adaTestnet", chainId: 103,chainType: chainDict.ADA, chainIndex:chainIndexDict.ADA,nature: chainNature.system.id},

  // Arbitrum
  {name:"arbMainnet", chainId: 42161,chainType: chainDict.ARB, chainIndex:chainIndexDict.ARB, isMainnet: true, nature: chainNature.system.id},//todo : need update chainId
  {name:"arbTestnet", chainId: 421611,chainType: chainDict.ARB, chainIndex:chainIndexDict.ARB, isMainnet: false, nature: chainNature.system.id},
  {name:"arbGoerli", chainId: 421613,chainType: chainDict.ARB, chainIndex:chainIndexDict.ARB, isMainnet: false, nature: chainNature.custom.id},

  // OPM
  {name:"opmMainnet", chainId: 10,chainType: chainDict.OPM, chainIndex:chainIndexDict.OPM, isMainnet: true, nature: chainNature.system.id},//todo : need update chainId
  {name:"opmTestnet", chainId: 69,chainType: chainDict.OPM, chainIndex:chainIndexDict.OPM, isMainnet: false, nature: chainNature.system.id},
  {name:"opmGoerli", chainId: 420,chainType: chainDict.OPM, chainIndex:chainIndexDict.OPM, isMainnet: false, nature: chainNature.custom.id},

  // Fantom
  {name:"ftmMainnet", chainId: 250,chainType: chainDict.FTM, chainIndex:chainIndexDict.FTM, isMainnet: true, nature: chainNature.system.id},
  // {name:"ftmTestnet", chainId: 4002,chainType: chainDict.FTM, chainIndex:chainIndexDict.FTM, isMainnet: false, nature: chainNature.system.id},
  {name:"ftmTestnet", chainId: 4002,chainType: chainDict.FTM, chainIndex:chainIndexDict.FTM, isMainnet: false, nature: chainNature.custom.id},

  // XinFin
  {name:"xdcMainnet", chainId: 50,chainType: chainDict.XDC, chainIndex:chainIndexDict.XDC, isMainnet: true, nature: chainNature.system.id},
  {name:"xdcTestnet", chainId: 51,chainType: chainDict.XDC, chainIndex:chainIndexDict.XDC, isMainnet: false, nature: chainNature.system.id},

  // Okex
  {name:"oktMainnet", chainId: 66,chainType: chainDict.OKT, chainIndex:chainIndexDict.OKT, isMainnet: true, nature: chainNature.system.id},
  {name:"oktTestnet", chainId: 65,chainType: chainDict.OKT, chainIndex:chainIndexDict.OKT, isMainnet: false, nature: chainNature.custom.id},

  // Clover
  {name:"clvMainnet", chainId: 1024,chainType: chainDict.CLV, chainIndex:chainIndexDict.CLV, isMainnet: true, nature: chainNature.custom.id},
  // {name:"clvTestnet", chainId: 1023,chainType: chainDict.CLV, chainIndex:chainIndexDict.CLV, isMainnet: false, nature: chainNature.custom.id},
  {name:"clvTestnet", chainId: 1024,chainType: chainDict.CLV, chainIndex:chainIndexDict.CLV, isMainnet: false, nature: chainNature.custom.id},
];

const networkDict = networkInfo.reduce((reduced, next) => {
  if (!reduced[next.name]) {
    reduced[next.name] = next;
    reduced[next.name]["network"] = (next.nature === chainNature.custom.id) ? chainNature.custom.network : next.name;
  }
  return reduced;
}, {});

const networks = Object.values(networkDict).map(v => v.name);

const defaultGas = {
  gasPrice: 10000000000,
  gasLimit: 800000
}

const defaultNodeUrlDict = {
  mainnet:  'http://gwan-mainnet.wandevs.org:26891', // http or wss
  testnet: 'http://gwan-testnet.wandevs.org:36891', // http or wss,
  ethereum: 'http://geth-mainnet.wandevs.org:26892', // http or wss,
  rinkeby: 'http://geth-testnet.wandevs.org:36892', // http or wss
  goerli: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // http or wss
  bscMainnet: 'https://bsc-dataseed1.binance.org:443', // http or wss,
  bscTestnet: 'https://data-seed-prebsc-1-s1.binance.org:8545', // http or wss
  avalancheMainnet: "https://api.avax.network/ext/bc/C/rpc",
  avalancheTestnet: "https://api.avax-test.network/ext/bc/C/rpc",
  moonbeamMainnet: "https://rpc.api.moonbeam.network",
  moonbeamTestnet: "https://rpc.testnet.moonbeam.network",
  moonriverMainnet: "https://rpc.api.moonriver.moonbeam.network", // "https://rpc.moonriver.moonbeam.network"
  moonriverTestnet: "https://moonbeam-alpha.api.onfinality.io/public",
  maticTestnet: "https://rpc-mumbai.matic.today",
  maticMainnet: "https://rpc-mainnet.matic.network",
  adaTestnet: "https://rpc-evm.portal.dev.cardano.org",
  // adaMainnet: "https://rpc-evm.portal.dev.cardano.org",
  arbMainnet: "https://arb1.arbitrum.io/rpc", // todo : need update
  arbTestnet: "https://rinkeby.arbitrum.io/rpc",
  arbGoerli: "https://goerli-rollup.arbitrum.io/rpc",
  opmMainnet: "https://mainnet.optimism.io", // todo : need update
  opmTestnet: "https://kovan.optimism.io",
  opmGoerli: "https://goerli.optimism.io/",
  ftmMainnet: "https://rpc.ftm.tools",
  ftmTestnet: "https://rpc.testnet.fantom.network",
  xdcMainnet: "https://rpc.xinfin.network",
  xdcTestnet: "https://rpc.apothem.network",
  oktMainnet: "https://exchainrpc.okex.org",
  oktTestnet: "https://exchaintestrpc.okex.org",
  clvMainnet: "https://api-para.clover.finance",
  clvTestnet: "https://api-para.clover.finance",
}

const defaultHadrfork = "byzantium";

let defaultContractCfg = {};
Object.keys(networkDict).forEach(name => {
  defaultContractCfg[name] = {};
  defaultContractCfg[name].network = networkDict[name].network;
  defaultContractCfg[name].nodeURL = defaultNodeUrlDict[name];
  defaultContractCfg[name].hardfork = defaultHadrfork;
  defaultContractCfg[name].privateKey = '';
  defaultContractCfg[name].chainId = networkDict[name].chainId;
  defaultContractCfg[name].mnemonic = '';
  defaultContractCfg[name].index = 0;
  defaultContractCfg[name].gasPrice = defaultGas.gasPrice;
  defaultContractCfg[name].gasLimit = defaultGas.gasLimit;
});

let defaultArgv = {};
Object.keys(defaultContractCfg).forEach(name => {
  defaultArgv[name] = {};
  defaultArgv[name].network = defaultContractCfg[name].network;
  defaultArgv[name].nodeURL = defaultContractCfg[name].nodeURL;
  defaultArgv[name].mnemonic = defaultContractCfg[name].mnemonic;
  defaultArgv[name].ownerIdx = defaultContractCfg[name].index;
  defaultArgv[name].adminIdx = defaultContractCfg[name].index;
  defaultArgv[name].ownerPk = defaultContractCfg[name].privateKey;
  defaultArgv[name].adminPk = defaultContractCfg[name].privateKey;
  defaultArgv[name].chainId = defaultContractCfg[name].chainId;
  defaultArgv[name].gasPrice = defaultContractCfg[name].gasPrice;
  defaultArgv[name].gasLimit = defaultContractCfg[name].gasLimit;
  defaultArgv[name].outputDir = '';
});

const curveMap = new Map([
  ['secp256k1', 0],
  ['bn256', 1]
]);
const priceSymbol = chainDict.WAN;
const quotaDepositRate = 15000;
const htlcTimeTestnet = 60*60; //unit: s
const fastCrossMinValue = 1000000000000000; // 0.001 USD
const ADDRESS_0 = "0x0000000000000000000000000000000000000000";

const contractLoad = "contract.js";
// const contractLoad = {
//   default: "contractV3.js",
//   v1: "contract.js",
//   v2: "contractV2.js",
//   v3: "contractV3.js",
// };

const actionDict = {
  prepare: "prepare",
  deploy: "deploy",
  update: "update",
};

const deployScript = {
  clean: "deploy_clean.js",
  update: "deploy_update.js",
  wanchainSc: "wanchain_sc_deploy.js",
  wanchainScUpdate: "wanchain_sc_update.js"
};

const wanchainScScript = (action) => {
  let script;
  switch (actionDict[action]) {
    case actionDict.deploy: {
      script = deployScript.wanchainSc;
      break;
    }
    case actionDict.update: {
      script = deployScript.wanchainScUpdate;
      break;
    }
    default: {
      throw new Error(`not support action ${action}`);
    }
  }
  return script
}

const bipChainIdDict = {
  BTC: 0x80000000,
  WAN: 0x8057414e,
  ETH: 0x8000003c,
  ETC: 0x8000003d,
  EOS: 0x800000c2,
  BSC: 0x800002ca,
  AVAX: 0x80002328,
  MOVR: 0x40000001,
  MOONBEAM: 0x40000004,
  MATIC: 0x800003c6,
  ADA: 0x80000717,// TODO: NEED UPDATE,
  ARB: 0x40000002,
  OPM: 0xa, // TODO: NEED UPDATE,
  FTM: 0x800003ef,
  XDC: 0x80000226,
  TRX: 0x800000c3, // 2147483843,
  XRP: 0x80000090, // 2147483792
  OKT: 0x800003e4,
  CLV: 0x40000005,
  PHA: 0x40000007,
};

const hideKeys = [
  "privateKey",
  "adminCrossPrivateKey",
  "adminOraclePrivateKey",
  "adminSmgPrivateKey",
  "ownerPk",
  "adminPkCross",
  "adminPkOracle",
  "adminPkSmg",
  "mnemonic"
];

module.exports = {
  operationDict,
  chainDict,
  chainIndexDict,
  chainNature,
  networkDict,
  networks,

  defaultGas,
  defaultNodeUrlDict,
  defaultContractCfg,
  defaultArgv,

  contractLoad,
  actionDict,
  deployScript,
  wanchainScScript,

  curveMap,
  priceSymbol,
  quotaDepositRate,
  htlcTimeTestnet,
  fastCrossMinValue,
  ADDRESS_0,
  bipChainIdDict,
  hideKeys,
};
