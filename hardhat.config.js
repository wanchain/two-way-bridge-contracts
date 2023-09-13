require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.4.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      "contracts/lib/Multicall2.sol": {version:"0.5.16", settings: { optimizer: { enabled: true, runs: 200}}},
      "contracts/GroupApprove/GroupApprove.sol": {version:"0.8.18", settings: { optimizer: { enabled: true, runs: 200}}},
    },
  },
  networks: {
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: [process.env.PK],
    },
    bscTestnet: {
      url: 'https://bsctestapi.terminet.io/rpc',
      accounts: [process.env.PK],
    },
    moonbaseAlfa: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: [process.env.PK],
    },
    goerli: {
      url: 'https://rpc.ankr.com/eth_goerli',
      accounts: [process.env.PK],
    },
    wanchainTestnet: {
      url: 'https://gwan-ssl.wandevs.org:46891',
      accounts: [process.env.PK],
    },
    shibuya: {
      url: 'https://evm.shibuya.astar.network',
      accounts: [process.env.PK],
    },
    astar: {
      // url: 'https://astar-mainnet.g.alchemy.com/v2/3A48KG9F7zeoEXkJWpNYbQwpnOHUVWOU',
      url: 'https://evm.astar.network',
      accounts: [process.env.PK],
    },
    optimisticEthereum: {
      url: 'https://optimism.publicnode.com',
      accounts: [process.env.PK],
    },
    telos_testnet: {
      url: 'https://testnet.telos.net/evm',
      accounts: [process.env.PK],
    },
    telos_mainnet: {
      url: 'https://mainnet.telos.net/evm',
      accounts: [process.env.PK],
    },
    fxTestnet: {
      url: "https://testnet-fx-json-web3.functionx.io:8545",
      accounts: [process.env.PK]
    },
    fxMainnet: {
      url: "https://fx-json-web3.functionx.io:8545",
      accounts: [process.env.PK]
    },
    gatherTestnet: {
      url: "https://testnet.gather.network",
      accounts: [process.env.PK]
    },
    gatherMainnet: {
      url: "https://mainnet.gather.network",
      accounts: [process.env.PK]
    },
    metisTestnet: {
      url: "https://goerli.gateway.metisdevops.link",
      accounts: [process.env.PK]
    },
    okbTestnet: {
      url: "https://okbtestrpc.okbchain.org",
      accounts: [process.env.PK]
    },
    metisMainnet: {
      url: "https://andromeda.metis.io/?owner=1088",
      accounts: [process.env.PK]
    },
    songbirdTestnet: {
      url: "https://coston-api.flare.network/ext/C/rpc",
      accounts: [process.env.PK]
    },
    songbirdMainnet: {
      url: "https://songbird-api.flare.network/ext/C/rpc",
      accounts: [process.env.PK]
    },
    horizenTestnet: {
      url: "https://rpc.ankr.com/horizen_testnet_evm",
      accounts: [process.env.PK]
    },
    horizenMainnet: {
      url: "https://horizen:c-ZMm4u72okCVALPA_Bb0Y@pool.zenchain.info/ethv1",
      accounts: [process.env.PK]
    },
    vinuTestnet: {
      url: "https://vinuchain-rpc.com",
      accounts: [process.env.PK]
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PK]
    },
    ethereum: {
      url: 'https://ethereum.publicnode.com',
      accounts: [process.env.PK]
    },
    bsc: {
      url: 'https://bsc-rpc.gateway.pokt.network',
      accounts: [process.env.PK]
    },
    avax: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [process.env.PK]
    },
    moonriver: {
      url: 'https://rpc.api.moonriver.moonbeam.network',
      accounts: [process.env.PK]
    },
    moonbeam: {
      url: 'https://rpc.ankr.com/moonbeam',
      accounts: [process.env.PK]
    },
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: [process.env.PK]
    },
    fantom: {
      url: 'https://fantom.publicnode.com',
      accounts: [process.env.PK]
    },
    xinfin: {
      url: 'https://rpc.xdcrpc.com',
      accounts: [process.env.PK]
    },
    okt: {
      url: 'https://exchainrpc.okex.org',
      accounts: [process.env.PK]
    },
    clover: {
      url: 'https://api-para.clover.finance',
      accounts: [process.env.PK],
      chainId: 1024,
      gasPrice: 20e9,
      gas: 8e6,
    },
    energiTestnet: {
      url: 'https://nodeapi.test.energi.network',
      accounts: [process.env.PK],
    },

    wanchainMainnet: {
      url: "https://gwan-ssl.wandevs.org:56891",
      accounts: [process.env.PK],
      gasPrice: 2e9,
      gas: 8e6,
      chainId: 888,
    }
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "VUYMNSMVSN52DGIUDTYFQTDA26SZI1ZMC7",
      bscTestnet: "X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6",
      moonbaseAlpha: "EE37GEZGJA7RHS3ZKXWW1JJVDXZ6SBYBRC",
      goerli: "HNUE7V72CI8XJ6FNZ1CDIYSEBYY6HHREAE",
      optimisticEthereum: "JSYSW7GDUAAZ4U7WN3SCFE7NM62IBB6GFC",
      astar: 'X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6', //fake
    },
    customChains: [
      {
        network: "astar",
        chainId: 592,
        urls: {
          apiURL: "https://blockscout.com/astar/api",
          browserURL: "https://blockscout.com/astar"
        }
      }
    ]
  },
};
