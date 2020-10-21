const chainDict = {
  WAN: "WAN",
  ETH: "ETH",
  ETC: "ETC",
  EOS: "EOS",
  TEST: "TEST"
};

const chainIdxDict = {
  WAN: 0x57414e,
  ETH: 0x3c,
  ETC: 0x3d,
  EOS: 0xc2,
};

const deployScript = {
  clean: "deploy_clean.js",
  update: "deploy_update.js",
  wanchainSc: "wanchain_sc_deploy.js"
};

const wanchainScScript = deployScript.wanchainSc;

const contractLoad = "contract.js";

const curveMap = new Map([
  ['secp256k1', 0],
  ['bn256', 1]
]);
const priceSymbol = chainDict.WAN;
const quotaDepositRate = 15000;
const htlcTimeTestnet = 60*60; //unit: s
const ADDRESS_0 = "0x0000000000000000000000000000000000000000";

const networkDict = {
  // WAN
  mainnet: "mainnet",
  testnet: "testnet",
  // ETH
  ethereum: "ethereum",
  rinkeby: "rinkeby"
}
// const networks = ["mainnet", "testnet", "ethereum", "rinkeby"];
const networks = Object.values(networkDict);

const defaultContractCfg = {
  chainType: chainDict.WAN, // 'WAN' or 'ETH'
  nodeURL: 'http://gwan-testnet.wandevs.org:36891', // http or wss
  privateKey: '',
  mnemonic: '',
  gasPrice: 180000000000,
  gasLimit: 8000000
};

module.exports = {
  chainDict,
  chainIdxDict,
  defaultContractCfg,

  contractLoad,
  deployScript,
  wanchainScScript,

  curveMap,
  priceSymbol,
  quotaDepositRate,
  htlcTimeTestnet,
  ADDRESS_0,
  networkDict,
  networks
};
