const bip39 = require('bip39');

const Web3 = require('web3');
const ethUtil = require('ethereumjs-util');
const ethTx = require('ethereumjs-tx').Transaction
const wallet = require('ethereumjs-wallet');
const hdkey = require('ethereumjs-wallet/hdkey');

const wanUtil = require('wanchain-util');
const wanTx = wanUtil.wanchainTx;

const {
  chainDict,
  chainIdxDict,
  defaultContractCfg
} = require('./config');

class ContractWrapper {
  constructor(userCfg) {
    // update config
    this.cfg = Object.assign({}, defaultContractCfg, userCfg);

    // init
    this.init();
  }

  init() {
    // init web3
    if (!this.cfg.nodeURL) {
      throw new Error("nodeURL is required");
    }
    if (this.cfg.nodeURL.indexOf('http:') == 0) {
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.cfg.nodeURL));
    } else if (this.cfg.nodeURL.indexOf('wss:') == 0) {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.cfg.nodeURL));
    } else {
      throw new Error("invalid protocol, can only be http or wss");
    }

    // private key
    if (!this.cfg.privateKey && this.cfg.mnemonic) {
      this.privateKey = ContractWrapper.exportPrivateKey(this.cfg.mnemonic);
    } else if (typeof(this.cfg.privateKey) === "string") {
      if (this.cfg.privateKey.startWith('0x')) {
        const pos = this.cfg.privateKey.indexOf('0x');
        this.cfg.privateKey = this.cfg.privateKey.slice(pos, this.cfg.privateKey.length);
      }
      if ((!this.cfg.privateKey) || this.cfg.privateKey.length != 64){
        throw new Error("invalid private key");
      } else {
        this.privateKey = Buffer.from(this.cfg.privateKey, 'hex');
      }
    } else {
      throw new Error("invalid private key");
    }
    this.deployerAddress = this.privateKeyToAddress(this.privateKey);

    this.chainType = this.cfg.chainType;
  }

  // privateKeyToAddress(buffer) {
  //   return `0x${ethUtil.privateToAddress(buffer).toString('hex').toLowerCase()}`;
  // }

  privateKeyToAddress(privateKey) {
    if (!Buffer.isBuffer(privateKey)) {
      privateKey = Buffer.from(privateKey, "hex")
    }
    return ethUtil.bufferToHex(ethUtil.privateToAddress(privateKey));
  };

  contractAt(abi, address) {
    let contract = new this.web3.eth.Contract(abi, address);
    contract.address = contract._address;
    return contract;
  }

  async getChainId() {
    if (!this.chainId) {
      this.chainId = await this.web3.eth.getChainId();
    }

    return this.chainId;
  }

  getNonce(address) {
    return this.web3.eth.getTransactionCount(address, 'pending');
  }

  readContract(contract, func, ...args) {
    return new Promise((resolve, reject) => {
      try {
        let cb = (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        };

        if (args.length) {
          return contract.methods[func](...args).call(cb);
        }
        return contract.methods[func]().call(cb);
      } catch (err) {
        return reject(err);
      }
    });
  }

  encodeTx(contract, func, ...args) {
    if (args.length) {
      return contract.methods[func](...args).encodeABI();
    }
    return contract.methods[func]().encodeABI();
  }

  async sendTx(contractAddr, data, value = 0) {
    if (0 != data.indexOf('0x')){
      data = `0x${data}`;
    }

    let value2Wei = this.web3.utils.toWei(value.toString(), 'ether');
    value2Wei = new this.web3.utils.BN(value2Wei);
    value2Wei = `0x${value2Wei.toString(16)}`;

    let rawTx = {
      chainId: this.getChainId(),
      to: contractAddr,
      nonce: await this.getNonce(this.deployerAddress),
      gasPrice: this.cfg.gasPrice,
      gasLimit: this.cfg.gasLimit,
      value: value2Wei,
      data: data
    };
    // console.log("serializeTx: %O", rawTx);

    let tx
    if (this.chainType === chainDict.ETH) {
      tx = new ethTx(rawTx);
    } else {
      rawTx.Txtype = 0x01;
      tx = new wanTx(rawTx);
    }
    // console.log("tx", JSON.stringify(tx, null, 4));
    tx.sign(this.privateKey);

    try {
      let receipt = await this.web3.eth.sendSignedTransaction(`0x${tx.serialize().toString('hex')}`);
      return receipt;
    } catch(err) {
      console.error("sendTx to contract %s error: %O", contractAddr, err);
      return null;
    }
  }

  static exportPrivateKey(mnemonic, chainIdx = chainIdxDict.WAN, pos = 0) {
    const seed = bip39.mnemonicToSeedSync(mnemonic); // mnemonic is the string containing the words
    const hdk = hdkey.fromMasterSeed(seed);
    // const addr_node = hdk.derivePath(`m/44'/60'/0'/0/${pos}`); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
    const addr_node = hdk.derivePath(`m/44'/${chainIdx}'/0'/0/${pos}`); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
    // const addr = addr_node.getWallet().getAddressString(); //check that this is the same with the address that ganache list for the first account to make sure the derivation is correct
    // console.log("index to Address", addr)
    // const private_key = addr_node.getWallet().getPrivateKey().toString("hex");
    const private_key = addr_node.getWallet().getPrivateKey();
    return private_key;
  }

  static exportHDAddress(mnemonic, chainIdx = chainIdxDict.WAN, pos = 0) {
    const seed = bip39.mnemonicToSeedSync(mnemonic); // mnemonic is the string containing the words
    const hdk = hdkey.fromMasterSeed(seed);
    // const addr_node = hdk.derivePath(`m/44'/60'/0'/0/${pos}`); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
    const addr_node = hdk.derivePath(`m/44'/${chainIdx}'/0'/0/${pos}`); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
    const addr = addr_node.getWallet().getAddressString(); //check that this is the same with the address that ganache list for the first account to make sure the derivation is correct
    // console.log("index to Address", addr)
    // const private_key = addr_node.getWallet().getPrivateKey().toString("hex");
    const private_key = addr_node.getWallet().getPrivateKey();
    return {
      address: addr,
      privateKey:private_key
    };
  }

  static getChainIndex(chainType) {
    chainType = chainType && chainType.toUpperCase();
    return chainIdxDict[chainType];
  }

}

module.exports = ContractWrapper;
