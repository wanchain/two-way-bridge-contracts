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
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
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
  },
  // tron usdt
  {
    id: 273,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.ETH,
    toAccount: "0x8331595fb5d64466a6877276337782a94e647005"
  },
  {
    id: 274,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.OKT,
    toAccount: "0x418dd07e73253948839272efbc9c080a1b299b62"
  },
  {
    id: 275,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.BSC,
    toAccount: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd"
  },
  {
    id: 276,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.MATIC,
    toAccount: "0x5b0b9d1a58cacb8e3f7cb72225996fc535530f6b"
  },
  {
    id: 277,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.ARB,
    toAccount: "0x9b281146a04a67948f4601abda704016296017c5"
  },
  {
    id: 278,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.XDC,
    toAccount: "0xd4b5f10d61916bd6e0860144a91ac658de8a1437"
  },
  {
    id: 279,
    aInfo: {
      account: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0xEA51342DABBB928AE1E576BD39EFF8AAF070A8C6",
    toChainID: bipChainIdDict.AVAX,
    toAccount: "0x1f6515c5e45c7d572fbb5d18ce613332c17ab288"
  },
  // tron usdc
  {
    id: 280,
    aInfo: {
      account: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
    toChainID: bipChainIdDict.ETH,
    toAccount: "0x4a8359b4fce6f6e01180a6bf74fdb3545ab1cd07"
  },
  {
    id: 281,
    aInfo: {
      account: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
    toChainID: bipChainIdDict.WAN,
    toAccount: "0x7fF465746e4F47e1CbBb80c864CD7DE9F13337fE"
  },
  {
    id: 282,
    aInfo: {
      account: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
    toChainID: bipChainIdDict.BSC,
    toAccount: "0x64544969ed7ebf5f083679233325356ebe738930"
  },
  {
    id: 283,
    aInfo: {
      account: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
    toChainID: bipChainIdDict.MATIC,
    toAccount: "0x07d307bd7dcbf34932efd1593484ee75a83eb7e1"
  },
  {
    id: 284,
    aInfo: {
      account: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainID: bipChainIdDict.TRX
    },
    fromChainID: bipChainIdDict.TRX,
    fromAccount: "0x3017D3AAE03A8934E3482632D9C13B292F06898A",
    toChainID: bipChainIdDict.AVAX,
    toAccount: "0x80aa952fa7e752cb0f3d0b6f62ea1ec8b783a3da"
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
  // add
  let receipt = await contract.send("addTokenPair", tp.id, tp.aInfo, tp.fromChainID, tp.fromAccount, tp.toChainID, tp.toAccount);
  showTxInfo(receipt, "TokenManagerProxy");
  // get
  let tpInfo = await contract.call("getTokenPairInfo", tp.id);
  console.log({tpInfo});
}

module.exports = addTokenPair;