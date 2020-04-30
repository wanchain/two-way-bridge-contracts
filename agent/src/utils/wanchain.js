const fs = require('fs');
const path = require('path');
const config = require('../../cfg/config');
const abiMap = require('../../cfg/abi');
const keythereum = require('keythereum');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');

const keystore = JSON.parse(fs.readFileSync(config.keystore.path, "utf8"));
const selfSk = keythereum.recover(config.keystore.pwd, keystore); // Buffer
const selfPk = ethUtil.privateToPublic(selfSk); // Buffer
const selfAddress = '0x' + ethUtil.pubToAddress(selfPk).toString('hex');

const web3 = new Web3(new Web3.providers.HttpProvider(config.wanNodeURL));

const createGpkSc = getContract('CreateGpk', config.contractAddress.createGpk);

function getContract(name, address) {
  let abi = abiMap.get(name);
  if (abi) {
    return new web3.eth.Contract(abi, address);
  } else {
    return null;
  }
}

function getElapsed(chainTs) {
  return ((new Date() / 1000).toFixed(0) - chainTs);
}

async function sendTx(contractAddr, data) {
  if (0 != data.indexOf('0x')){
    data = '0x' + data;
  }

  let nonce = await web3.eth.getTransactionCount(selfAddress);
  let rawTx = {
      Txtype: 0x01, // wanchain only
      nonce: nonce,
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
      to: contractAddr,
      value: '0x0',
      data: data
  };
  let tx = new Tx(rawTx);
  tx.sign(selfSk);

  try {
    let txHash = await web3.eth.sendRawTransaction('0x' + tx.serialize().toString('hex'));
    return txHash;
  } catch(err) {
    console.error("send tx data %s to contract %s error: %O", data, contractAddr, err);
    return '';
  }
}

async function getTxReceipt(txHash) {
  try {
    let receipt = await web3.eth.getTransactionReceipt(txHash);
    // console.log("getTxReceipt %s receipt: %O", txHash, receipt);
    return receipt;
  } catch(err) {
    // console.log("getTxReceipt %s none: %O", txHash, err);
    return null;
  }
}

async function sendPloyCommit(groupId, polyCommit) {
  let order = polyCommit.length;
  let buf = new Buffer(order * 64 * 2);
  let offset = 0;
  for (let i = 0; i < order; i++) {
    let temp = polyCommit[i].getEncoded(false).toString('hex').substr(2);
    temp.copy(buf, offset);
    offset += 128;
  }
  let pcStr = '0x' + buf.toString('hex');
  let txData = await createGpkSc.methods.setPolyCommit(groupId, pcStr).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;
}

async function sendGpk(groupId, polyCommit) {
  let txHash = await createGpkSc.methods.setGpk(groupId).call();
  return txHash;
}

async function sendEncSij(groupId, dest, encSij) {
  let encSijStr = '0x' + encSij.toString('hex');
  let txData = await createGpkSc.methods.setEncSij(groupId, dest, encSijStr).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;  
}

async function sendCheckStatus(groupId, src, isValid) {
  let txData = await createGpkSc.methods.setCheckStatus(groupId, src, isValid).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;  
}

async function sendSij(groupId, dest, sij, r) {
  let sijStr = '0x' + sij.toString('hex');
  let rStr = '0x' + r.toString('hex');
  let txData = await createGpkSc.methods.revealSij(groupId, dest, sijStr, rStr).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;
}

async function sendEncSijTimeout(groupId, src) {
  let txData = await createGpkSc.methods.encSijTimeout(groupId, src).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;
}

async function sendCheckTimeout(groupId, dest) {
  let txData = await createGpkSc.methods.checkEncSijTimeout(groupId, dest).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;
}

async function sendSijTimeout(groupId, src) {
  let txData = await createGpkSc.methods.SijTimeout(groupId, src).encodeABI();
  let txHash = await sendTx(config.contractAddress.createGpk, txData);
  return txHash;
}

module.exports = {
  selfSk,
  selfPk,
  selfAddress,
  getContract,
  getElapsed,
  sendTx,
  getTxReceipt,
  sendGpk,
  sendPloyCommit,
  sendEncSij,
  sendCheckStatus,
  sendSij,
  sendEncSijTimeout,
  sendCheckTimeout,
  sendSijTimeout
}