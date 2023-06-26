// require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
// require("@matterlabs/hardhat-zksync-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  zksolc: {
    version: "1.3.11",
    compilerSource: "binary",
    settings: {
      isSystem: false, // optional.  Enables Yul instructions available only for zkSync system contracts and libraries
      forceEvmla: false, // optional. Falls back to EVM legacy assembly if there is a bug with Yul
      optimizer: {
        enabled: true, // optional. True by default
        mode: '3' // optional. 3 by default, z to optimize bytecode size
      },
      libraries: {
        "contracts/crossApproach/lib/RapidityLibV4.sol": {
          "RapidityLibV4": "0x0000000000000000000000000000000000000000",
        },
        "contracts/crossApproach/lib/NFTLibV1.sol": {
          "NFTLibV1": "0x0000000000000000000000000000000000000000",
        },
        "contracts/gpk/lib/GpkLib.sol": {
          "GpkLib": "0x0000000000000000000000000000000000000000",
        },
        "contracts/lib/CommonTool.sol": {
          "CommonTool": "0x0000000000000000000000000000000000000000",
        },
        "contracts/metric/lib/MetricLib.sol": {
          "MetricLib": "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/StoremanUtil.sol": {
          "StoremanUtil": "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/IncentiveLib.sol": {
          "IncentiveLib": "0x0000000000000000000000000000000000000000",
        },
        "contracts/storemanGroupAdmin/StoremanLib.sol": {
          "StoremanLib": "0x0000000000000000000000000000000000000000",
        },
      },
    }
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      // viaIR: true
    }
  },
  paths: {
    artifacts: "build-zk/artifacts",
    cache: "build-zk/cache",
    deploy: "scripts",
    sources: "./contracts",
  },
  networks: {
    zkSyncTestnet: {
      url: "https://testnet.era.zksync.dev",
      // ethNetwork: "https://rpc.ankr.com/eth_goerli", // The Ethereum Web3 RPC URL, or the identifier of the network (e.g. `mainnet` or `goerli`)
      ethNetwork: "goerli", // The identifier of the network (e.g. `mainnet` or `goerli`)
      zksync: true, // Set to true to target zkSync Era.
      verifyURL: 'https://zksync2-testnet-explorer.zksync.dev/contract_verification',
      accounts: [process.env.TestnetOwnerPK]
    },
  },
  // etherscan: {
  //   apiKey: {
  //     // avalancheFujiTestnet: "VUYMNSMVSN52DGIUDTYFQTDA26SZI1ZMC7",
  //     // bscTestnet: "X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6",
  //     // moonbaseAlpha: "EE37GEZGJA7RHS3ZKXWW1JJVDXZ6SBYBRC",
  //     // goerli: "HNUE7V72CI8XJ6FNZ1CDIYSEBYY6HHREAE",
  //     // optimisticEthereum: "JSYSW7GDUAAZ4U7WN3SCFE7NM62IBB6GFC",
  //     // astar: 'X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6', //fake
  //   },
  //   // customChains: [
  //   //   {
  //   //     network: "astar",
  //   //     chainId: 592,
  //   //     urls: {
  //   //       apiURL: "https://blockscout.com/astar/api",
  //   //       browserURL: "https://blockscout.com/astar"
  //   //     }
  //   //   }
  //   // ]
  // },
  defaultNetwork: "zkSyncTestnet",
};
