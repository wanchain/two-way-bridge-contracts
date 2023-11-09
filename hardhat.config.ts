require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-truffle5");
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");

require("@matterlabs/hardhat-zksync-verify");

require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 600000,
  },
  zksolc: {
    version: "1.3.16",
    compilerSource: "binary",
    settings: {
      isSystem: false, // optional.  Enables Yul instructions available only for zkSync system contracts and libraries
      forceEvmla: false, // optional. Falls back to EVM legacy assembly if there is a bug with Yul
      optimizer: {
        enabled: true, // optional. True by default
        mode: "3", // optional. 3 by default, z to optimize bytecode size
      },
      libraries: {
        "contracts/crossApproach/lib/RapidityLibV4.sol": {
          RapidityLibV4: "0x7b5ab1C1776f6c980ED4c762abd7acE5B9d5D22C",
        },
        "contracts/crossApproach/lib/NFTLibV1.sol": {
          NFTLibV1: "0x0C24Ee2FB82FE87536cdBeA2AB89e42AB1287e97",
        },
        "contracts/gpk/lib/GpkLib.sol": {
          GpkLib: "0x0000000000000000000000000000000000000000",
        },
        "contracts/lib/CommonTool.sol": {
          CommonTool: "0x0000000000000000000000000000000000000000",
        },
        "contracts/metric/lib/MetricLib.sol": {
          MetricLib: "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/StoremanUtil.sol": {
          StoremanUtil: "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/IncentiveLib.sol": {
          IncentiveLib: "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/StoremanLib.sol": {
          StoremanLib: "0x0000000000000000000000000000000000000000",
        },
      },
    },
  },
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.TestnetOwnerPK],
    },
    bscTestnet: {
      url: "https://bsctestapi.terminet.io/rpc",
      accounts: [process.env.TestnetOwnerPK],
    },
    moonbaseAlfa: {
      url: "https://rpc.testnet.moonbeam.network",
      accounts: [process.env.TestnetOwnerPK],
    },
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      accounts: [process.env.TestnetOwnerPK],
    },
    wanchainTestnet: {
      url: "https://gwan-ssl.wandevs.org:46891",
      accounts: [process.env.TestnetOwnerPK],
    },
    shibuya: {
      url: "https://evm.shibuya.astar.network",
      accounts: [process.env.TestnetOwnerPK],
    },
    astar: {
      // url: 'https://astar-mainnet.g.alchemy.com/v2/3A48KG9F7zeoEXkJWpNYbQwpnOHUVWOU',
      url: "https://evm.astar.network",
      accounts: [process.env.TestnetOwnerPK],
    },
    optimisticEthereum: {
      url: "https://opt-mainnet.g.alchemy.com/v2/EA2PhKrouVck-pDZscwY8AEGv_G-TXvj",
      accounts: [process.env.TestnetOwnerPK],
    },
    telos_testnet: {
      url: "https://testnet.telos.net/evm",
      accounts: [process.env.TestnetOwnerPK],
    },
    telos_mainnet: {
      url: "https://mainnet.telos.net/evm",
      accounts: [process.env.TestnetOwnerPK],
    },
    fxTestnet: {
      url: "https://testnet-fx-json-web3.functionx.io:8545",
      accounts: [process.env.TestnetOwnerPK],
    },
    fxMainnet: {
      url: "https://fx-json-web3.functionx.io:8545",
      accounts: [process.env.TestnetOwnerPK],
    },
    gatherTestnet: {
      url: "https://testnet.gather.network",
      accounts: [process.env.TestnetOwnerPK],
    },
    gatherMainnet: {
      url: "https://mainnet.gather.network",
      accounts: [process.env.TestnetOwnerPK],
    },
    metisTestnet: {
      url: "https://goerli.gateway.metisdevops.link",
      accounts: [process.env.TestnetOwnerPK],
    },
    okbTestnet: {
      url: "https://okbtestrpc.okbchain.org",
      accounts: [process.env.TestnetOwnerPK],
    },
    wanTestnet: {
      gasPrice: 2e9,
      gasLimit: 2e7,
      bip44ChainId: 2147492648, // TODO fake chainID.
      url: "http://gwan-testnet.wandevs.org:36891",
      accounts: [process.env.TestnetOwnerPK],
    },
    wanMainnet: {
      gasPrice: 2000000000,
      url: "https://gwan-ssl.wandevs.org:56891",
      accounts: [process.env.TestnetOwnerPK],
    },
    zkSyncTestnet: {
      url: "https://zksync2-testnet.zksync.dev",
      accounts: [process.env.TestnetOwnerPK],
      ethNetwork: "goerli",
      zksync: true,
      // contract verification endpoint
      verifyURL:
        "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    },
    zkSyncMainnet: {
      // url: 'https://mainnet.era.zksync.io',
      url: 'https://zksync-era.blockpi.network/v1/rpc/public',
      accounts: [process.env.TestnetOwnerPK],
      ethNetwork: "mainnet",
      zksync: true,
      verifyURL: 'https://zksync2-mainnet-explorer.zksync.io/contract_verification',
      bip44ChainId: 1073741837,
    },
    polyZkTestnet: {
      //gasPrice:200000000,
      url: "https://rpc.public.zkevm-test.net",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 1073741838,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
    },
    baseTestnet: {
      gasPrice: 1e6,
      url: "https://goerli.base.org",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 1073741841,
    },
    baseMainnet: {
      url: "https://base.publicnode.com",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 1073741841,
    },
    energiMainnet: {
      url: "https://nodeapi.energi.network",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 2147493445,
    },
    polyZkMainnet: {
      //gasPrice:200000000,
      url: "https://zkevm-rpc.com",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 0,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
    },
    lineaTestnet: {
      gasPrice: 3e9, // can not delete.
      url: "https://rpc.goerli.linea.build",
      accounts: [process.env.TestnetOwnerPK],
      bip44ChainId: 2147492648, // TODO fake chainID.
    },
    hardhat: {
      accounts: {
        mnemonic: "skill level pulse dune pattern rival used syrup inner first balance sad",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        accountsBalance: "9000000000000000000000000000",
        count: 60,
      },
      mining: {
        auto: true,
        interval: 0
      },
      allowBlocksWithSameTimestamp: true,
      gas: 1e7,
      gasPrice: 1e9,
      blockGasLimit: 5e7,
      allowUnlimitedContractSize: true,
    },  
  },
  etherscan: {
    apiKey: {
      // baseMainnet: ""
      baseTestnet:'PLACEHOLDER_STRING',
    },
    customChains: [
      {
        network: "astar",
        chainId: 592,
        urls: {
          apiURL: "https://blockscout.com/astar/api",
          browserURL: "https://blockscout.com/astar",
        },
      },
      {
        network: "baseTestnet",
        chainId: 84531,
        urls: {
         apiURL: "https://api-goerli.basescan.org/api",
         browserURL: "https://goerli.basescan.org"
        }
      },
      {
        network: "baseMainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};

module.exports = config;
