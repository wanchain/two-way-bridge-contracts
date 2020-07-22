const fs = require('fs');
const path = require('path');
const utils = require("../utils");
const Web3 = require('web3');
const keythereum = require('keythereum');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;

const web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.58:7654'));

// group
const groupId = utils.stringTobytes32(parseInt(Date.now()/1000/90).toString());
const stakerCount = 7;
const ksPath = path.join(__dirname, '../keystore/');

// contract
let smgSc;
let owner = "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e";
let selectedSmList = []; // {txAddress, pk, sk}

contract('open_storeman_it', async () => {
  before("start smg", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    await registerGroup();
    await stakeIn();
    await select();
  })

  it('it_stub', async () => {
  })

  async function sendTx(scAddress, sender, sk, nonce, value, data) {
    if (nonce == 0) {
      nonce = await web3.eth.getTransactionCount(sender, "pending");
    }
    let rawTx = {
      Txtype: 0x01,
      nonce: nonce,
      gasPrice: 1000000000,
      gasLimit: 4000000,
      to: scAddress,
      value: value,
      data: data,
    }
    let tx = new Tx(rawTx);
    tx.sign(sk);
    const serializedTx = '0x' + tx.serialize().toString('hex');
    let receipt = await web3.eth.sendSignedTransaction(serializedTx);
    console.log("%s stakeIn tx hash: %s", sender, receipt.transactionHash);
    return receipt.transactionHash;
  }  
 
  async function registerGroup() {
    let start = parseInt(Date.now() / 1000 / 120);
    let workDuration = 2;
    let registerDuration = 10;
    let preGroupId = '0x';
    let count = 4;
    let wks = [];
    let srs= [];
    for (let i = 0; i < count; i++) {
      let {addr: sr} = utils.getAddressFromInt(i + 1000);
      let {addr: wk} = utils.getAddressFromInt(i + 2000);
      wks.push(wk);
      srs.push(sr);
      console.log("white list %i: %s, %s", i, wk, sr);
    }
    await smgSc.storemanGroupRegisterStart(groupId, start, workDuration, registerDuration, preGroupId, wks, srs, {from: owner});
    console.log("register group: %O", await smgSc.getStoremanGroupInfo(groupId));
    await smgSc.updateGroupChain(groupId, 0, 1, 0, 1, {from: owner});
    console.log("set group curve: [%d, %d]", 0, 1);
  }
  
  async function stakeIn() {
    let ps = new Array(stakerCount);
    for (let i = 0; i < stakerCount; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let sf = utils.getAddressFromInt(i + 1000);
          let sw = utils.getAddressFromInt(i + 2000);
          let en = utils.getAddressFromInt(i + 3000);
          let data = smgSc.contract.methods.stakeIn(groupId, sw.pk, en.pk, 666).encodeABI();
          await sendTx(smgSc.address, sf.addr, sf.priv, 0, 2000, data);
          resolve();
        } catch (err) {
          console.error("stakeIn %i tx error: %O", i, err);
          reject(err);
        }
      })
    }
    await Promise.all(ps);
  }
  
  async function select() {
    let leader = utils.getAddressFromInt(2000);
    // console.log("select leader: %O", leader);
    let data = smgSc.contract.methods.select(groupId).encodeABI();
    await sendTx(smgSc.address, leader.addr, leader.priv, 0, 0, data);
    let count = await smgSc.getSelectedSmNumber(groupId);
    console.log("slected sm number: %d", count);
    // get selected
    let ps = new Array(count);
    for (let i = 0; i < count; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let si = await smgSc.getSelectedSmInfo(groupId, i);
          let txAddress = si[0].toLowerCase();
          selectedSmList.push({txAddress: txAddress, pk: '0x04' + si[1].substr(2), sk: getSmSk(txAddress)});
          resolve();
        } catch (err) {
          console.error("stakeIn %i tx error: %O", i, err);
          reject(err);
        }
      })
    }
    await Promise.all(ps);
    console.log("selected sm: %O", selectedSmList);
  }

  async function getSmSk(txAddress) {
    let p = path.join(ksPath, txAddress);
    const keystore = JSON.parse(fs.readFileSync(p, "utf8"));
    return keythereum.recover('wanglu', keystore); // Buffer
  }
})