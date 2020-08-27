/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require("truffle-hdwallet-provider");
const mnemonic = "skill level pulse dune pattern rival used syrup inner first balance sad"; 


//const WanProvider = require('wanchain-truffle-sdk').WanProvider;
//`wss://apitest.wanchain.org:8443/ws/v3/57b5005c60b8c444d880afe02d0a41cf4dc269f9c186940aa169412bb245f1c0`
//const wanProvider = new WanProvider("0x5ea5559749ba066086313f051eb1c142c6d81d1bed1baf0f26e708a2a9decbec", "http://192.168.1.58:7654");

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    nodeploy: {
     host: "192.168.1.179",     // Localhost (default: none)
     port: 7654,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
     from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
     admin: "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
    },
    development: {
      host: "192.168.1.179",     // Localhost (default: none)
      port: 7654,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
      admin: "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
      gas: 8000000,          // Gas sent with each transaction (default: ~6700000)
      gasPrice: 1000000000   // 20 gwei (in wei) (default: 100 gwei)
    },

    // Useful for deploying to a public network.
    local: {
      //provider: () => new HDWalletProvider(mnemonic, "http://localhost:8545",0,10),
      port:8545,
      mnemonic:"skill level pulse dune pattern rival used syrup inner first balance sad",
      host:"127.0.0.1",
      from:"0xEf73Eaa714dC9a58B0990c40a01F4C0573599959",
      admin: "0xdF0A667F00cCfc7c49219e81b458819587068141",
      network_id: "*",
    },

      testnet: {
          host: "192.168.1.2",     // Localhost (default: none)
          port: 8545,            // Standard Ethereum port (default: none)
          network_id: "*",       // Any network (default: none)
          from: "0x9da26fc2e1d6ad9fdd46138906b0104ae68a65d8",
          admin: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
          gas: 1e7,          // Gas sent with each transaction (default: ~6700000)
          gasPrice: 1e9,   // 20 gwei (in wei) (default: 100 gwei)
          skipDryRun:true
      },
    // testnet: {
    //   provider: wanProvider,
    //   network_id: "*",
    //   gas: 8000000,
    //   confirmations: 0,
    //   timeoutBlocks: 200,
    //   skipDryRun: true
    // },

    coverage: {
        host: '127.0.0.1',
        mnemonic:"skill level pulse dune pattern rival used syrup inner first balance sad",
        admin: "0xdF0A667F00cCfc7c49219e81b458819587068141",
        network_id: '*',
        port: 5545,
        gas: 0xfffffffffff,
        gasPrice: 0x01
    }

  },
  // Set default mocha options here, use special reporters etc.
  mocha: {
	  enableTimeouts:false,
     	timeout: 300000000
  },
  plugins: ["solidity-coverage"],      

  // Configure your compilers
    compilers: {
        solc: {
            version: '0.7.0',
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
    }
}
