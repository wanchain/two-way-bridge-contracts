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
  zksolc: {
    version: "1.3.13",
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
          RapidityLibV4: "0x474a1f2a37f8BE41521EeB78AAB3a78E315b49fB",
        },
        "contracts/crossApproach/lib/NFTLibV1.sol": {
          NFTLibV1: "0x3Cf32FCEE7D8E71D29184C3CbbCE6069d67Fd2bC",
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
      accounts: [process.env.PK],
    },
    bscTestnet: {
      url: "https://bsctestapi.terminet.io/rpc",
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
    optimisticEthereum: {
      url: "https://opt-mainnet.g.alchemy.com/v2/EA2PhKrouVck-pDZscwY8AEGv_G-TXvj",
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
      url: "https://okbtestrpc.okbchain.org",
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
    polyZkMainnet: {
      //gasPrice:200000000,
      url: "https://zkevm-rpc.com",
      accounts: [process.env.PK],
      bip44ChainId: 0,
      signCurveId: 0, // ecdsa
      hashType: 1, // keccak256
    },
    lineaTestnet: {
      gasPrice: 3e9, // can not delete.
      url: "https://rpc.goerli.linea.build",
      accounts: [process.env.PK],
      bip44ChainId: 2147492648, // TODO fake chainID.
    },
    local: {
      url: "http://127.0.0.1:8545",
      mnemonic:
        "skill level pulse dune pattern rival used syrup inner first balance sad",
      gasPrice: 1, // 20 gwei (in wei) (default: 100 gwei)
    },
    coverage: {
      url: "http://127.0.0.1:5545",
      mnemonic:
        "skill level pulse dune pattern rival used syrup inner first balance sad",
      gasPrice: 1, // 20 gwei (in wei) (default: 100 gwei)
    },
  },
  etherscan: {
    apiKey: {
      // baseMainnet: ""
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
