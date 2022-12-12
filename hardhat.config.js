require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.4.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
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
      url: 'https://astar.public.blastapi.io',
      accounts: [process.env.PK],
    }
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "VUYMNSMVSN52DGIUDTYFQTDA26SZI1ZMC7",
      bscTestnet: "X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6",
      moonbaseAlpha: "EE37GEZGJA7RHS3ZKXWW1JJVDXZ6SBYBRC",
      goerli: "HNUE7V72CI8XJ6FNZ1CDIYSEBYY6HHREAE",
      astar: 'X3KC4YWKNDM8N3MJ52SFJC21GT9T5DWRK6', //fake
    },
  },
};
