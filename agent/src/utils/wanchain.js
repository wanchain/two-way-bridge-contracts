const fs = require('fs');
const path = require('path');
const config = require('../../cfg/config');
const abiMap = require('../../cfg/abi');
const keythereum = require('keythereum');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3_1.2');
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;

const keystore = JSON.parse(fs.readFileSync(config.keystore.path, "utf8"));
const selfSk = keythereum.recover(config.keystore.pwd, keystore); // Buffer
const selfPk = ethUtil.privateToPublic(selfSk); // Buffer
const selfAddress = '0x' + ethUtil.pubToAddress(selfPk).toString('hex').toLowerCase();
let selfNonce = 0;
console.log("keystore path: %s", config.keystore.path);
// console.log("sk: %s", '0x' + selfSk.toString('hex'));
console.log("pk: %s", '0x' + selfPk.toString('hex'));
console.log("address: %s", selfAddress);

const web3 = new Web3(new Web3.providers.HttpProvider(config.wanNodeURL));

const gpkSc = getContract('gpk', config.contractAddress.gpk);

function getContract(name, address) {
  let abi = abiMap.get(name);
  if (abi) {
    return new web3.eth.Contract(abi, address);
  } else {
    return null;
  }
}

function getElapsed(baseTs) {
  if (baseTs == 0) {
    return 0;
  }
  return ((new Date() / 1000).toFixed(0) - baseTs);
}

async function updateNounce() {
  try {
    selfNonce = await web3.eth.getTransactionCount(selfAddress, 'pending');
    console.log("update address %s nonce %d", selfAddress, selfNonce);
  } catch (err) {
    console.error("update address %s nonce err: %O", selfAddress, err);
  }
}

async function sendTx(contractAddr, data) {
  return new Promise((resolve) => {
    if (0 != data.indexOf('0x')){
      data = '0x' + data;
    }
    let rawTx = {
        Txtype: 0x01, // wanchain only
        nonce: selfNonce++,
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit,
        to: contractAddr,
        value: '0x0',
        data: data
    };
    // console.log("sendTx: %O", rawTx);
    let tx = new Tx(rawTx);
    tx.sign(selfSk);
    web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    .on('transactionHash', txHash => {
      // console.log("txHash: %s", txHash);
      resolve(txHash);
    })
    .on('error', err => {
      console.error("send tx data %s to contract %s error: %O", data, contractAddr, err);
      resolve('');
    })
  });
}

async function getTxReceipt(txHash, name = '') {
  try {
    let receipt = await web3.eth.getTransactionReceipt(txHash);
    console.log("getTxReceipt %s(%s) receipt %s gas %s", name, txHash, receipt.status, receipt.gasUsed);
    return receipt;
  } catch(err) {
    // console.log("getTxReceipt %s(%s) none: %O", name, txHash, err);
    return null;
  }
}

async function sendPloyCommit(groupId, round, curve, polyCommit) {
  let order = polyCommit.length;
  let buf = Buffer.alloc(order * 64);
  let offset = 0;
  for (let i = 0; i < order; i++) {
    let temp = Buffer.from(polyCommit[i].substr(2), 'hex');
    temp.copy(buf, offset);
    offset += 64;
  }
  let pcStr = '0x' + buf.toString('hex');
  console.log("group %s round %d curve %d sendPloyCommit %s", groupId, round, curve, "*" || pcStr);
  let txData = await gpkSc.methods.setPolyCommit(groupId, round, curve, pcStr).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function sendEncSij(groupId, round, curve, dest, encSij) {
  let txData = await gpkSc.methods.setEncSij(groupId, round, curve, dest, encSij).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;  
}

async function sendCheckStatus(groupId, round, curve, src, isValid) {
  let txData = await gpkSc.methods.setCheckStatus(groupId, round, curve, src, isValid).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;  
}

async function sendSij(groupId, round, curve, dest, sij, ephemPrivateKey) {
  let txData = await gpkSc.methods.revealSij(groupId, round, curve, dest, sij, ephemPrivateKey).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function sendPolyCommitTimeout(groupId, curve) {
  let txData = await gpkSc.methods.polyCommitTimeout(groupId, curve).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function sendEncSijTimeout(groupId, curve, src) {
  let txData = await gpkSc.methods.encSijTimeout(groupId, curve, src).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function sendCheckTimeout(groupId, curve, dest) {
  let txData = await gpkSc.methods.checkEncSijTimeout(groupId, curve, dest).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function sendSijTimeout(groupId, curve, src) {
  let txData = await gpkSc.methods.SijTimeout(groupId, curve, src).encodeABI();
  let txHash = await sendTx(config.contractAddress.gpk, txData);
  return txHash;
}

async function getBlockNumber() {
  return await web3.eth.getBlockNumber(); // promise
}

function getEvents(options) {
  return web3.eth.getPastLogs(options); // promise
}

function genKeystoreFile(gpk, sk, password) {
  let keystore = web3.eth.accounts.encrypt(sk, password);
  let gAddress = ethUtil.pubToAddress(Buffer.from(gpk.substr(2), 'hex')).toString('hex').toLowerCase(); // no 0x
  keystore.address = gAddress;
  let fp = path.join(__dirname, '../../keystore/', gpk);
  fs.writeFileSync(fp, JSON.stringify(keystore), 'utf8');
  fp = path.join(__dirname, '../../keystore/', gpk + '.pwd');
  fs.writeFileSync(fp, password, 'utf8');
}

function parseEvent(contractName, eventName, event) {
  let abi = abiMap.get(contractName);
  if (!abi) {
    console.log("invalid contract name %s to parse log", contractName);
    return null;
  }
  
  for (let i = 0; i < abi.length; i++) {
    const item = abi[i];
    if ((item.type == 'event') && (item.name == eventName)) {
      let decoded = web3.eth.abi.decodeLog(item.inputs, event.data, event.topics.slice(1));
      decoded._name_ = eventName;
      return decoded;
    }
  }
  return null;
}

module.exports = {
  selfSk,
  selfPk,
  selfAddress,
  getContract,
  getElapsed,
  updateNounce,
  sendTx,
  getTxReceipt,
  sendPloyCommit,
  sendEncSij,
  sendCheckStatus,
  sendSij,
  sendPolyCommitTimeout,
  sendEncSijTimeout,
  sendCheckTimeout,
  sendSijTimeout,
  getBlockNumber,
  getEvents,
  genKeystoreFile,
  parseEvent
}