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
    plyrTestnet: {
      url: 'https://subnets.avax.network/plyr/testnet/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 1073741849,
    },
    odysseyTestnet: {
      url: 'https://testnode.dioneprotocol.com/ext/bc/D/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 1073741848,
    },
    x1Mainnet: {
      url: 'https://xlayerrpc.okx.com',
      accounts: [process.env.PK],
      bip44ChainId: 1073741835,
    },
    horizenMainnet: {
      url: 'https://rpc.ankr.com/horizen_eon',
      accounts: [process.env.PK],
    },
    x1: {
      url: 'https://endpoints.omniatech.io/v1/xlayer/mainnet/public',
      accounts: [process.env.PK],
    },
    metis: {
      url: 'https://metis.drpc.org',
      accounts: [process.env.PK],
    },
    xdc: {
      url: 'https://rpc.xdc.org',
      accounts: [process.env.PK],
    },
    mainnet: {
      url: 'https://ethereum-rpc.publicnode.com',
      accounts: [process.env.PK],
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [process.env.PK],
    },
    arbitrum: {
      url: 'https://1rpc.io/arb',
      accounts: [process.env.PK],
    },
    okt: {
      url: 'https://1rpc.io/oktc',
      accounts: [process.env.PK],
    },
    polygon: {
      url: "https://polygon-bor-rpc.publicnode.com",
      accounts: [process.env.PK],
    },
    bsc: {
      url: 'https://bsc-dataseed2.bnbchain.org',
      accounts: [process.env.PK],
    },
    blastMainnet: {
      url: 'https://rpc.ankr.com/blast',
      accounts: [process.env.PK],
      bip44ChainId: 1073741846,
    },
    meldMainnet: {
      url: 'https://rpc-1.meld.com',
      accounts: [process.env.PK],
      bip44ChainId: 1073741847,
    },
    meldTestnet: {
      url: 'https://testnet-rpc.meld.com',
      accounts: [process.env.PK],
      bip44ChainId: 1073741847,
    },
    telos: {
      url: 'https://1rpc.io/telos/evm',
      accounts: [process.env.PK],
    },
    clover: {
      url:'https://api-para.clover.finance',
      accounts: [process.env.PK],
    },
    fantom: {
      url: "https://fantom.drpc.org",
      accounts: [process.env.PK],
    },
    moonbeam: {
      url: 'https://moonbeam-rpc.publicnode.com',
      accounts: [process.env.PK],
    },
    moonriver: {
      url: "https://moonriver-rpc.publicnode.com",
      accounts: [process.env.PK],
    },
    brockTestnet: {
      url: 'https://testnet.bit-rock.io',
      accounts: [process.env.PK],
    },
    vinuTestnet: {
      url: 'https://vinufoundation-rpc.com',
      accounts: [process.env.PK],
    },
    baseSepolia: {
      url: 'https://base-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
      gasPrice: 1.5e9,
    },
    arbSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [process.env.PK],
    },
    optSepolia: {
      url: 'https://optimism-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
      gasPrice: 1.5e9,
    },
    ethSepolia: {
      url: 'https://ethereum-sepolia.publicnode.com',
      accounts: [process.env.PK],
    },
    xdcTestnet: {
      url: 'https://rpc.apothem.network',
      accounts: [process.env.PK],
    },
    energiTestnet: {
      url: 'https://nodeapi.test.energi.network',
      accounts: [process.env.PK],
    },
    horizenTestnet: {
      url: 'https://rpc.ankr.com/horizen_gobi_testnet',
      accounts: [process.env.PK],
    },
    fantomTestnet: {
      url: "https://rpc.ankr.com/fantom_testnet",
      accounts: [process.env.PK],
    },
    polygonTestnet: {
      url: "https://rpc.ankr.com/polygon_mumbai",
      accounts: [process.env.PK],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.PK],
    },
    bscTestnet: {
      url: "https://bsc-testnet.publicnode.com",
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
      gasPrice: 2e9,
      gasLimit: 8000000,
      bip44ChainId: 2147483649, // fake one
    },
    shibuya: {
      url: "https://evm.shibuya.astar.network",
      accounts: [process.env.PK],
      gasPrice: 1200e9,
    },
    astar: {
      // url: 'https://astar-mainnet.g.alchemy.com/v2/3A48KG9F7zeoEXkJWpNYbQwpnOHUVWOU',
      url: "https://evm.astar.network",
      accounts: [process.env.PK],
    },
    optimisticEthereum: {
      url: "https://optimism-rpc.publicnode.com",
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
    zkSyncSepolia: {
      url: "https://sepolia.era.zksync.dev",
      accounts: [process.env.PK],
      ethNetwork: "sepolia",
      zksync: true,
      // contract verification endpoint
      verifyURL:
        "https://sepolia.explorer.zksync.io/contract_verification",
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
    arbTestnet: {
      url: 'https://arbitrum-goerli.publicnode.com',
      accounts: [process.env.PK],
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
    apiKey: '64b5b282-760c-4c59-ac26-21bb41666342',
    // apiKey: {
    //   fantom: 'I66N3VPZB8DYNCGGTXQ4KIBY72N541EHK4',
    //   moonbeam: 'EE37GEZGJA7RHS3ZKXWW1JJVDXZ6SBYBRC',
    //   moonriver: "PI7KZFKW195W1H4C69F1FIQNEAR55T37NH",
    //   // baseMainnet: ""
    //   baseTestnet:'PLACEHOLDER_STRING',
    //   meldMainnet:'PLACEHOLDER_STRING',
    //   blastMainnet: 'IYY8RX5RN9QEUBU733VDRUJWBNFDHYAH2H',
    //   lineaMainnet: 'WW4J7R5WJEET4PAWH4P2AEWWUGEGAZ23XJ',
    //   bsc: 'X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6',
    //   optimisticEthereum: 'JSYSW7GDUAAZ4U7WN3SCFE7NM62IBB6GFC',
    //   polygon: '2AYUVE3SN2QKBF5JVXNCM6G345MWR6M4FU',
    //   arbitrum: 'GF1T9XXJ3KSBRHV1Z234EXZNR9N1I29I75',
    //   avalanche: 'APIKEY',
    //   mainnet: 'HNUE7V72CI8XJ6FNZ1CDIYSEBYY6HHREAE',
    //   astar: 'APIKEY',
    //   x1Mainnet: '64b5b282-760c-4c59-ac26-21bb41666342'
    // },
    customChains: [
      {
        network: "x1Mainnet",
        chainId: 196, //196 for mainnet
        urls: {
            apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
            browserURL: "https://www.oklink.com/xlayer"
        }
      },
      {
        network: 'avalanche',
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io",
        }
      },
      {
        network: 'arbitrum',
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io",
        }
      },
      {
        network: 'blastMainnet',
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io",
        }
      },
      {
        network: 'meldMainnet',
        chainId: 333000333,
        urls: {
          apiURL: "https://api.meldscan.io/api",
          browserURL: "https://meldscan.io",
        }
      },
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
        network: "lineaMainnet",
        chainId: 59144,
        urls: {
         apiURL: "https://api.lineascan.build/api",
         browserURL: "https://lineascan.build"
        }
      },
      {
        network: 'fantom',
        chainId: 250,
        urls: {
          apiURL: "https://api.ftmscan.com/api",
          browserURL: "https://ftmscan.com",
        }
      }
    ],
  },
};

module.exports = config;
