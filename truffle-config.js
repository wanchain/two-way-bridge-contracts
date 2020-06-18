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
const Transaction = require("wanchain-util").wanchainTx
const HDWalletProvider = require('@truffle/hdwallet-provider');
//const infuraKey = "eed9f47eee3d4104a990f9e45ea2c545";
//`wss://apitest.wanchain.org:8443/ws/v3/57b5005c60b8c444d880afe02d0a41cf4dc269f9c186940aa169412bb245f1c0`
const fs = require('fs');
const wanProvider = new HDWalletProvider("0x5ea5559749ba066086313f051eb1c142c6d81d1bed1baf0f26e708a2a9decbec", "http://52.35.168.75:36891");
wanProvider.engine._providers[0].signTransaction = (txParams, cb) =>{
  let pkey=Buffer.from("5ea5559749ba066086313f051eb1c142c6d81d1bed1baf0f26e708a2a9decbec", 'hex');
  txParams.Txtype = 0x01;
  txParams.gas = 9000000;
  //console.log("txParams:", txParams)
  const tx = new Transaction(txParams);
  tx.sign(pkey);
  const rawTx = `0x${tx.serialize().toString("hex")}`;
  //console.log("rawTx:", rawTx)
  cb(null, rawTx);
};
//console.log("wanProvider.engine:", wanProvider.engine)

const blockTagForPayload = require("web3-provider-engine/util/rpc-cache-utils.js").blockTagForPayload
const ethUtil = require('ethereumjs-util')

wanProvider.engine._providers[1].handleRequest = function(payload, next, end){
  const self = this

  switch(payload.method) {

    case 'eth_getTransactionCount':
      var blockTag = blockTagForPayload(payload)
      var address = payload.params[0].toLowerCase()
      var cachedResult = self.nonceCache[address]
      // only handle requests against the 'pending' blockTag
      if (blockTag === 'pending') {
        // has a result
        if (cachedResult) {
          end(null, cachedResult)
        // fallthrough then populate cache
        } else {
          next(function(err, result, cb){
            if (err) return cb()
            if (self.nonceCache[address] === undefined) {
              self.nonceCache[address] = result
            }
            cb()
          })
        }
      } else {
        next()
      }
      return

    case 'eth_sendRawTransaction':
      // allow the request to continue normally
      next(function(err, result, cb){
        // only update local nonce if tx was submitted correctly
        if (err) return cb()
        // parse raw tx
        var rawTx = payload.params[0]
        var stripped = ethUtil.stripHexPrefix(rawTx)
        var rawData = new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex')
        var tx = new Transaction(new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex'))
        // extract address
        var address = '0x'+tx.getSenderAddress().toString('hex').toLowerCase()
        // extract nonce and increment
        var nonce = ethUtil.bufferToInt(tx.nonce)
        nonce++
        // hexify and normalize
        var hexNonce = nonce.toString(16)
        if (hexNonce.length%2) hexNonce = '0'+hexNonce
        hexNonce = '0x'+hexNonce
        // dont update our record on the nonce until the submit was successful
        // update cache
        self.nonceCache[address] = hexNonce
        cb()
      })
      return

    default:
      next()
      return

  }
}

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
    },
    development: {
      host: "192.168.1.179",     // Localhost (default: none)
      port: 7654,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      // from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
      gas: 8000000,          // Gas sent with each transaction (default: ~6700000)
      gasPrice: 1000000000   // 20 gwei (in wei) (default: 100 gwei)
    },
    // Another network with more advanced options...
    // advanced: {
      // port: 8777,             // Custom port
      // network_id: 1342,       // Custom network
      // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
      // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
      // from: <address>,        // Account to send txs from (default: accounts[0])
      // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },

    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    testnet: {
      provider: () => wanProvider,
      network_id: "*",       // Ropsten's id
      gas: 5500000,        // Ropsten has a lower block limit than mainnet
      confirmations: 0,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },

    // Useful for private networks
    // private: {
      // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
      // network_id: 2111,   // This network is yours, in the cloud.
      // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
	  enableTimeouts:false,
     	timeout: 300000000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.4.24",
      // version: "0.5.1",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    }
  }
}
