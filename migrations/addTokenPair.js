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
    toAccount: "0x78c6523192078D1cf5C3eC355733A1B9131Be7f3"
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
    toAccount: "0x3ecc2399611A26E70dbac73714395b13Bc3B69fA"
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
    toAccount: "0x95492fD2f5b2D2e558e8aF811f951e2DCbc846d3"
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
    toAccount: "0x7e76Ae3b4791A3c36233655d1e37Ec82F666bEFf"
  },
  {
    id: 129,
    aInfo: {
      account: ADDRESS_0,
      name: "TRX",
      symbol: "TRX",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.WAN,
    toAccount: "0x2B6Bae71dBB0860A705D11A8604FaE228b1F5a7e"
  },
  {
    id: 132,
    aInfo: {
      account: "0x3736db8ba90e2013fba678d003b8626883037826",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3736db8ba90e2013fba678d003b8626883037826",
    toChainID: bipChainIdDict.WAN,
    toAccount: "0x3D5950287b45F361774E5fB6e50d70eEA06Bc167"
  },
  {
    id: 133,
    aInfo: {
      account: "0x28c96b26f6df3cf57a0a4e8fef02e9295e9ca458",
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.ETH
    },
    fromChainID: bipChainIdDict.ETH,
    fromAccount: "0x28c96b26f6df3cf57a0a4e8fef02e9295e9ca458",
    toChainID: bipChainIdDict.XDC,
    toAccount: "0xD4B5f10D61916Bd6E0860144a91Ac658dE8a1437"
  },
  {
    id: 134,
    aInfo: {
      account: ADDRESS_0,
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
      chainID: bipChainIdDict.XRP
    },
    fromChainID: bipChainIdDict.XRP,
    fromAccount: ADDRESS_0,
    toChainID: bipChainIdDict.TRX,
    toAccount: "0x10b69a397a27e6faef2b5e82075b6caca643a096"
  }
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
  // add
  let receipt = await contract.send("addTokenPair", tp.id, tp.aInfo, tp.fromChainID, tp.fromAccount, tp.toChainID, tp.toAccount);
  showTxInfo(receipt, "TokenManagerProxy");
  // get
  let tpInfo = await contract.call("getTokenPairInfo", tp.id);
  console.log({tpInfo});
}

module.exports = addTokenPair;