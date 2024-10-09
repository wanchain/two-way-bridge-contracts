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
    "5ireTestnet": {
      url: "https://rpc.testnet.5ire.network",
      accounts: [process.env.PK],
      bip44ChainId: 1073741853,
    },
    "5ireMainnet": {
      url: "https://rpc.5ire.network",
      accounts: [process.env.PK],
      bip44ChainId: 1073741853,
    },
    dioneTestnet:{
      url: "https://testnode.dioneprotocol.com/ext/bc/D/rpc",
      accounts: [process.env.PK],
      bip44ChainId: 1073741848,
    },
    arbSepolia: {
      url: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
    },
    opSepolia: {
      url: 'https://optimism-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
    },
    amoy: {
      url: "https://rpc.ankr.com/polygon_amoy",
      accounts: [process.env.PK],
    },
    sepolia: {
      url: "https://rpc.ankr.com/eth_sepolia",
      accounts: [process.env.PK],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.PK],
    },
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      accounts: [process.env.PK],
    },
    moonbaseAlfa: {
      url: "https://rpc.testnet.moonbeam.network",
      accounts: [process.env.PK],
    },
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      accounts: [process.env.PK],
    },
    wanchainTestnet: {
      url: "https://gwan-ssl.wandevs.org:46891",
      accounts: [process.env.PK],
    },
    shibuya: {
      url: "https://evm.shibuya.astar.network",
      accounts: [process.env.PK],
    },
    astar: {
      // url: 'https://astar-mainnet.g.alchemy.com/v2/3A48KG9F7zeoEXkJWpNYbQwpnOHUVWOU',
      url: "https://evm.astar.network",
      accounts: [process.env.PK],
    },
    opMainnet: {
      url: "https://optimism-rpc.publicnode.com	",
      accounts: [process.env.PK],
    },
    telos_testnet: {
      url: "https://testnet.telos.net/evm",
      accounts: [process.env.PK],
    },
    telos_mainnet: {
      url: "https://mainnet.telos.net/evm",
      accounts: [process.env.PK],
    },
    fxTestnet: {
      url: "https://testnet-fx-json-web3.functionx.io:8545",
      accounts: [process.env.PK],
    },
    fxMainnet: {
      url: "https://fx-json-web3.functionx.io:8545",
      accounts: [process.env.PK],
    },
    gatherTestnet: {
      url: "https://testnet.gather.network",
      accounts: [process.env.PK],
    },
    gatherMainnet: {
      url: "https://mainnet.gather.network",
      accounts: [process.env.PK],
    },
    metisTestnet: {
      url: "https://goerli.gateway.metisdevops.link",
      accounts: [process.env.PK],
    },
    okbTestnet: {
      url: "https://x1testrpc.okx.com/",
      bip44ChainId: 1073741835,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
      accounts: [process.env.PK],
    },
    wanTestnet: {
      gasPrice: 2e9,
      gasLimit: 2e7,
      bip44ChainId: 2147492648, // TODO fake chainID.
      url: "http://gwan-testnet.wandevs.org:36891",
      accounts: [process.env.PK],
    },
    wanMainnet: {
      gasPrice: 2000000000,
      url: "https://gwan-ssl.wandevs.org:56891",
      accounts: [process.env.PK],
    },
    zkSyncTestnet: {
      url: "https://zksync2-testnet.zksync.dev",
      accounts: [process.env.PK],
      ethNetwork: "goerli",
      zksync: true,
      // contract verification endpoint
      verifyURL:
        "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
    },
    zkSyncMainnet: {
      // url: 'https://mainnet.era.zksync.io',
      url: 'https://zksync-era.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
      ethNetwork: "mainnet",
      zksync: true,
      verifyURL: 'https://zksync2-mainnet-explorer.zksync.io/contract_verification',
      bip44ChainId: 1073741837,
    },
    polyZkTestnet: {
      //gasPrice:200000000,
      url: "https://rpc.public.zkevm-test.net",
      accounts: [process.env.PK],
      bip44ChainId: 1073741838,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
    },
    baseTestnet: {
      gasPrice: 1e6,
      url: "https://goerli.base.org",
      accounts: [process.env.PK],
      bip44ChainId: 1073741841,
    },
    baseMainnet: {
      url: "https://base.publicnode.com",
      accounts: [process.env.PK],
      bip44ChainId: 1073741841,
    },
    energiMainnet: {
      url: "https://nodeapi.energi.network",
      accounts: [process.env.PK],
      bip44ChainId: 2147493445,
    },
    polyZkMainnet: {
      url: "https://zkevm-rpc.com",
      accounts: [process.env.PK],
      bip44ChainId: 1073741838,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
    },
    lineaTestnet: {
      gasPrice: 3e9, // can not delete.
      url: "https://rpc.goerli.linea.build",
      accounts: [process.env.PK],
      bip44ChainId: 1073741842,
    },
    lineaMainnet: {
      gasPrice: 3e9, // can not delete.
      url: "https://1rpc.io/linea",
      accounts: [process.env.PK],
      bip44ChainId: 1073741842,
    },
    bitrockTestnet: {
      url: "https://testnet.bit-rock.io",
      accounts: [process.env.PK],
      bip44ChainId: 2154655314,
    },
    bitrockMainnet: {
      url: "https://connect.bit-rock.io",
      accounts: [process.env.PK],
      bip44ChainId: 2154655314,
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
    apiKey: 'X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6',
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
      {
        network: "arbSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
      {
        network: "opMainnet",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io",
        },
      },
      {
        network: "opSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io",
        },
      },
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "lineaMainnet",
        chainId: 59144,
        urls: {
         apiURL: "https://api.lineascan.build/api",
         browserURL: "https://lineascan.build"
        }
      },
    ],
  },
};

module.exports = config;
