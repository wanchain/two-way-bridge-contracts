
module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
      gas: 10000000,
      gasPrice: 180000000000
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 6545,
      gas: 0xfffffffffff,
      gasPrice: 0x01
    },
    testnet: {
      // host: "3096j71n97.zicp.vip",
      host: "192.168.1.2",
      // host: "192.168.1.4",
      port: 8545,
      // port: 6666,
      network_id: "*", // Match any network id
      gas: 1e7,
      gasPrice: 180e9,
      from: '0xbf12c73ccc1f7f670bf80d0bba93fe5765df9fec'
      // from:'0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e'
    }
  },
  plugins: ["solidity-coverage"],
  compilers: {
    solc: {
      version: '0.4.26',
      optimizer: {
        enabled: true,
        runs: 1000000
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "byzantium"
      }
    }
  },
  mocha: {
    enableTimeouts: false
  }
};


