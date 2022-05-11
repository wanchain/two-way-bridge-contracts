const path = require("path");
const fs = require("fs");
const Contract = require("./utils/contract");
const { defaultContractCfg, bipChainIdDict, ADDRESS_0 } = require('./utils/config');
const { concatObject, showTxInfo } = require("./utils/tool");

const tokenPairInfo = [
  {
    id: 114,
    aInfo: {
      account: ADDRESS_0,
      name: "XDC",
      symbol: "XDC",
      decimals: 18,
      chainID: bipChainIdDict.XDC
    },
    fromChainID: bipChainIdDict.XDC,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.WAN,
    toAccount: "0xc7dca84A81324075e90A39250B0e07b7Daf4F45d"
  },
  {
    id: 115,
    aInfo: {
      account: ADDRESS_0,
      name: "XDC",
      symbol: "XDC",
      decimals: 18,
      chainID: bipChainIdDict.XDC
    },
    fromChainID: bipChainIdDict.XDC,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.AVAX,
    toAccount: "0x3a471089DC0a91676b1dbd62Da7e49DAB6b94D00"
  },
  {
    id: 116,
    aInfo: {
      account: ADDRESS_0,
      name: "XDC",
      symbol: "XDC",
      decimals: 18,
      chainID: bipChainIdDict.XDC
    },
    fromChainID: bipChainIdDict.XDC,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.BSC,
    toAccount: "0x3e7430a1DECffA4756D8C651634DE332940792d8"
  },
  {
    id: 117,
    aInfo: {
      account: ADDRESS_0,
      name: "XDC",
      symbol: "XDC",
      decimals: 18,
      chainID: bipChainIdDict.XDC
    },
    fromChainID: bipChainIdDict.XDC,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.MATIC,
    toAccount: "0x9a27a8950c256921b0afbe26823be717d612b447"
  },
]

async function addTokenPair(argv) {
  let tp = tokenPairInfo.find(v => v.id === argv.id);
  if (!tp) {
    console.error("invalid token pair id");
    return;
  }

  let deployed = require(path.join(__dirname, "deployed", (argv.network + ".json")));
  let abiFile = path.join(__dirname, "deployed", deployed["TokenManagerDelegate"].abi);
  let abi = JSON.parse(fs.readFileSync(abiFile, 'utf-8'));

  let cfg = concatObject(defaultContractCfg[argv.network], {
    network: argv.network,
    nodeURL: argv.nodeURL,
    privateKey: argv.ownerPk,
    mnemonic: argv.mnemonic,
    index: argv.ownerIdx,
    gasPrice: argv.gasPrice,
    gasLimit: argv.gasLimit
  });
  let contract = new Contract(cfg, abi, deployed["TokenManagerProxy"].address);
  let receipt = await contract.send("addTokenPair", tp.id, tp.aInfo, tp.fromChainID, tp.fromAccount, tp.toChainID, tp.toAccount);
  showTxInfo(receipt, "TokenManagerProxy");
}

module.exports = addTokenPair;