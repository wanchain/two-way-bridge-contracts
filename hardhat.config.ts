import { HardhatUserConfig } from "hardhat/config";

import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";

import "@matterlabs/hardhat-zksync-verify";

// dynamically changes endpoints for local tests
const zkSyncTestnet =
  process.env.NODE_ENV == "test"
    ? {
        url: "http://localhost:3050",
        ethNetwork: "http://localhost:8545",
        zksync: true,
      }
    : {
        url: "https://zksync2-testnet.zksync.dev",
        ethNetwork: "goerli",
        zksync: true,
        // contract verification endpoint
        verifyURL:
          "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
      };

const config: HardhatUserConfig = {
  zksolc: {
    version: "1.3.13",
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
          "RapidityLibV4": "0x264c2eB13970468458c08123CB70A1005a093c29",
        },
        "contracts/crossApproach/lib/NFTLibV1.sol": {
          "NFTLibV1": "0xb46Fdd7c2A7A2fd8278a52daD6FE130D964ccb13",
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
  defaultNetwork: "zkSyncTestnet",
  networks: {
    zkSyncTestnet,
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    }
  },
};

export default config;
