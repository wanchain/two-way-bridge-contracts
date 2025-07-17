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
    shidoMainnet: {
      url: "https://shido-mainnet-archive-lb-nw5es9.zeeve.net/USjg7xqUmCZ4wCsqEOOE/rpc",
      accounts: [process.env.PK],
      bip44ChainId: 1073741856,
    },
    edexaMainnet: {
      url: 'https://rpc.edexa.com',
      accounts: [process.env.PK],
      bip44ChainId: 1073741850,
      gasPrice: 30e9,
    },
    immutableTestnet: {
      url: "https://rpc.testnet.immutable.com",
      accounts: [process.env.PK],
      bip44ChainId: 1073741855,
    },
    lummioTestnet: {
      url: "http://188.245.49.86:32795",
      accounts: [process.env.PK],
      bip44ChainId: 1073741854,
    },
    fiveireMainnet: {
      url: "https://rpc.5ire.network",
      accounts: [process.env.PK],
      bip44ChainId: 1073741853,
    },
    polygonZkEvmTestnet: {
      url: "https://rpc.cardona.zkevm-rpc.com",
      accounts: [process.env.PK],
      bip44ChainId: 1073741838,
    },
    polygonZkEvmMainnet: {
      url: "https://rpc.ankr.com/polygon_zkevm",
      accounts: [process.env.PK],
      bip44ChainId: 1073741838,
    },
    waterfallMainnet: {
      url: 'https://rpc.waterfall.network',
      accounts: [process.env.PK],
      bip44ChainId: 1073741851,
    },
    songbirdMainnet: {
      url: 'https://rpc.au.cc/songbird',
      accounts: [process.env.PK],
      bip44ChainId: 1073741836,
    },
    edexaTestnet: {
      url: 'https://testnet.edexa.network/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 1073741850,
      gasPrice: 30e9,
    },
    plyrMainnet: {
      url: 'https://subnets.avax.network/plyr/mainnet/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 1073741849,
    },
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
      bip44ChainId: 2147483708,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0xfCeAAaEB8D564a9D0e71Ef36f027b9D162bC334e",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 2147492648,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0x74e121a34a66D54C33f3291f2cdf26B1cd037c3a",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
    },
    arbitrum: {
      url: 'https://1rpc.io/arb',
      accounts: [process.env.PK],
      bip44ChainId: 1073741826,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0xF7Ba155556E2CD4Dfe3Fe26e506A14d2f4b97613",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
    },
    okt: {
      url: 'https://1rpc.io/oktc',
      accounts: [process.env.PK],
    },
    polygon: {
      url: "https://polygon-bor-rpc.publicnode.com",
      accounts: [process.env.PK],
      bip44ChainId: 2147484614,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0x2216072A246A84f7b9CE0f1415Dd239C9bF201aB",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
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
      url: 'https://sepolia.base.org',
      accounts: [process.env.PK],
      gasPrice: 1.5e9,
      bip44ChainId: 1073741841,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x08bad1A48b0B08Bf769f83ba30c1DaD0F8Bb8b6B",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    arbSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [process.env.PK],
      bip44ChainId: 1073741826,
      timeout: 60000,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x08bad1A48b0B08Bf769f83ba30c1DaD0F8Bb8b6B",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    optSepolia: {
      url: 'https://optimism-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
      gasPrice: 1.5e9,
      bip44ChainId: 2147484262,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x08bad1A48b0B08Bf769f83ba30c1DaD0F8Bb8b6B",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    ethSepolia: {
      url: 'https://ethereum-sepolia.publicnode.com',
      accounts: [process.env.PK],
      bip44ChainId: 2147483708,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x589E12D073020f99FEBF32B739e58216748c9ed4",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
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
      url: "https://polygon-amoy.blockpi.network/v1/rpc/public",
      accounts: [process.env.PK],
    },
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
    dioneMainnet:{
      url: "https://node.dioneprotocol.com/ext/bc/D/rpc",
      accounts: [process.env.PK],
      bip44ChainId: 1073741848,
    },
    opSepolia: {
      url: 'https://sepolia.optimism.io',
      // url: 'https://optimism-sepolia.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK],
      bip44ChainId: 2147484262,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x08bad1A48b0B08Bf769f83ba30c1DaD0F8Bb8b6B",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      // url: "https://polygon-amoy-bor-rpc.publicnode.com",
      accounts: [process.env.PK],
      bip44ChainId: 2147484614,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0xFb06346e587ffB494438102515D576086bE750F4",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    sepolia: {
      url: 'https://ethereum-sepolia.publicnode.com',
      // url: "https://rpc.ankr.com/eth_sepolia",
      accounts: [process.env.PK],
      bip44ChainId: 2147483708,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x589E12D073020f99FEBF32B739e58216748c9ed4",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.PK],
      bip44ChainId: 2147492648,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x4c200A0867753454Db78AF84d147Bd03e567f234",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
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
      bip44ChainId: 2147484262,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0xC6Ae1Db6C66d909F7bFEeEb24F9adb8620bf9dbf",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
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
      url: 'https://mainnet.era.zksync.io',
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
      url: "https://base-sepolia.blockpi.network/v1/rpc/public",
      accounts: [process.env.PK],
      bip44ChainId: 1073741841,
    },
    baseMainnet: {
      url: "https://base.publicnode.com",
      accounts: [process.env.PK],
      bip44ChainId: 1073741841,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0x2715aA7156634256aE75240C2c5543814660CD04",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      },
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
    lineaSepoliaTestnet: {
      url: "https://rpc.sepolia.linea.build",
      accounts: [process.env.PK],
      bip44ChainId: 1073741842,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0xD25DB04661C468ea27C720970e9521d3F259690d",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
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
    sonicTestnet: {
      url: "https://rpc.blaze.soniclabs.com/",
      accounts: [process.env.PK],
      bip44ChainId: 2147493655,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x05211bBC9E0C1ED3bE0252021Cf558718ab65189",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    worldChainSepoliaTestnet: {
      url: "https://worldchain-sepolia.g.alchemy.com/public",
      // url: "https://worldchain-sepolia.drpc.org",
      // url: "https://4801.rpc.thirdweb.com",
      accounts: [process.env.PK],
      chainId: 4801,
      bip44ChainId: 1073741857,
      cctpV2: {
        proxyAdmin: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        delegateAdmin: "",
        feeToAddress: "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9",
        feeReadSC: "0x5292B2936daD44EdFbFB2929f9f246304167843b",
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      }
    },
    worldChainMainnet: {
      url: "https://worldchain-mainnet.g.alchemy.com/public",
      accounts: [process.env.PK],
      chainId: 480,
      bip44ChainId: 1073741857,
      cctpV2: {
        proxyAdmin: "0xa35B3C55626188015aC79F396D0B593947231976",
        delegateAdmin: "0xdD7bBc538dCdED78C9B5Bf108e95A0baa7d593cD",
        feeToAddress: "0x7Ded6550B8EBEFA202B648a086732b3724064318",
        feeReadSC: "0x0000000000000000000000000000000000000000",
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      }
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
    apiKey: {
      sepolia: "Placeholder",
      fuji: "Placeholder",
      opSepolia: "Placeholder",
      arbSepolia: "Placeholder",
      baseSepolia: "Placeholder",
      amoy: "Placeholder",
      lineaSepoliaTestnet: "Placeholder",
      sonicTestnet: "Placeholder",
      worldChainSepoliaTestnet: "Placeholder",
      worldChainMainnet: "Placeholder",
    },
    customChains: [
      {
        network: "sepolia",
        chainid: 11155111,
        chainId: 11155111,
        urls: {
            apiURL: "https://api.etherscan.io/v2/api?chainid=11155111",
            browserURL: "https://sepolia.etherscan.io"
        }
      },
      {
        network: "fuji",
        chainid: 43113,
        chainId: 43113,
        urls: {
            // apiURL: "https://api.etherscan.io/v2/api?chainid=43113",
            // browserURL: "https://testnet.snowscan.xyz/"
            apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
            browserURL: "https://avalanche.testnet.localhost:8080"
        }
      },
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
        network: "arbSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/"
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
      {
        network: "lineaSepoliaTestnet",
        chainId: 59141,
        urls: {
          // apiURL: "https://api.sepolia.lineascan.build/api",
          apiURL: "https://api.etherscan.io/v2/api?chainid=59141",
          browserURL: "https://sepolia.lineascan.build/"
        }
      },
      {
        network: "sonicTestnet",
        chainId: 57054,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=57054",
          browserURL: "https://testnet.sonicscan.org/"
        }
      },
      {
        network: "worldChainSepoliaTestnet",
        chainId: 4801,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=4801",
          browserURL: "https://sepolia.worldscan.org/"
        }
      },
      {
        network: "worldChainMainnet",
        chainId: 480,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=480",
          browserURL: "https://worldscan.org/"
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
