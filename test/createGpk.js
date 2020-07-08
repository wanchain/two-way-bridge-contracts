const fs = require('fs');
const path = require('path');
const utils = require("./utils");
const Web3 = require('web3')
const keythereum = require('keythereum');
const encoder = require("../utils/encoder");
const crossChainAccount = require('../utils/account/crossChainAccount');
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const CreateGpkProxy = artifacts.require('CreateGpkProxy');
const CreateGpkDelegate = artifacts.require('CreateGpkDelegate');
const Encrypt = artifacts.require('Encrypt');
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;

const web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.58:7654'));

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// token
const eosAccount = new crossChainAccount("eos", "ascii");

const eosToken = {
  // for register
  origAddr: eosAccount.encodeAccount('eosio.token:EOS'),
  name: encoder.str2hex('Wanchain EOS Crosschain Token'),
  symbol: encoder.str2hex('EOS'),
  decimals: 4
}

// group
const groupId = utils.stringTobytes32(parseInt(Date.now()/1000/120).toString());
const stakerCount = 7;
const ksPath = path.join(__dirname, './keystore/');

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, encryptSc;
let selectedSmList = []; // {txAddress, pk, sk}

contract('CreateGpk_UNITs', async ([owner, someone]) => {
  before("should do all preparations", async() => {
    console.log("onwer address: %s", owner);
    console.log("someone address: %s", someone);

    // unlock account
    await web3.eth.personal.unlockAccount(owner, 'wanglu', 99999);
    await web3.eth.personal.unlockAccount(someone, 'wanglu', 99999);

    // smg
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("StoremanGroup contract address: %s", smgProxy.address);

    // gpk
    gpkProxy = await CreateGpkProxy.deployed();
    gpkDelegate = await CreateGpkDelegate.deployed();
    gpkSc = await CreateGpkDelegate.at(gpkProxy.address);
    console.log("CreateGpk contract address: %s", gpkProxy.address);

    encryptSc = await Encrypt.deployed();

    await registerToken();
    await registerGroup();
    await stakeIn();
    await select();
  })

  // upgradeTo
  it('[CreateGpkProxy_upgradeTo] should fail: not owner', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: someone});
    } catch (e) {
      result = e;
      console.log(e);
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[CreateGpkProxy_upgradeTo] should fail: invalid implementation address', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to invalid address');
  })

  it('[CreateGpkProxy_upgradeTo] should success', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkProxy.address, {from: owner}); // set self address temporarily
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    assert.equal(await gpkProxy.implementation(), gpkDelegate.address)
  })

  it('[CreateGpkProxy_upgradeTo] should fail: duplicate upgrade', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to the same implementation');
  })

  // setDependence
  it('[CreateGpkDelegate_setDependence] should fail: not owner', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(smgSc.address, {from: someone});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[CreateGpkDelegate_setDependence] should fail: invalid smg address', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid smg');
  })
  
  it('[CreateGpkDelegate_setDependence] should success', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(smgSc.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    assert.equal(await gpkSc.smg.call(), smgSc.address);
  })

  // setPeriod
  it('[CreateGpkDelegate_setPeriod] should fail: not owner', async () => {
    let result = {};
    let ployCommitPeroid = 10 * 60;
    let defaultPeroid = 5 * 60;
    let negotiatePeroid = 15 * 60;
    try {
      await gpkSc.setPeriod(groupId, ployCommitPeroid, defaultPeroid, negotiatePeroid, {from: someone});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not owner');
  })
  
  it('[CreateGpkDelegate_setPeriod] should success', async () => {
    let result = {};
    let ployCommitPeroid = 10 * 60;
    let defaultPeroid = 5 * 60;
    let negotiatePeroid = 15 * 60;
    try {
      await gpkSc.setPeriod(groupId, ployCommitPeroid, defaultPeroid, negotiatePeroid, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let info = await gpkSc.getGroupInfo(groupId, -1);
    assert.equal(info[5], ployCommitPeroid);
    assert.equal(info[6], defaultPeroid);
    assert.equal(info[7], negotiatePeroid);
  })  

  // internal functions

  async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000))
  }
  
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
      chainId: 6,
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
  
  async function registerToken() {
    let tmProxy = await TokenManagerProxy.deployed();
    let tm = await TokenManagerDelegate.at(tmProxy.address);
    let ratio = 10000;
    let minDeposit = '0x99999999';
    let withdrawDelayTime = 60 * 60 * 72;
    await tm.addToken(eosToken.origAddr, ratio, minDeposit, withdrawDelayTime, eosToken.name, eosToken.symbol, eosToken.decimals)
    let token = await tm.getTokenInfo(eosToken.origAddr);
    console.log("register tokens:", token);
  }
  
  async function registerGroup() {
    let start = parseInt(Date.now() / 1000 / 120);
    let workDuration = 2;
    let registerDuration = 10;
    let crossFee = 33;
    let preGroupId = '0x';
    let count = 4;
    let wks = [];
    let srs= [];
    for (let i = 0; i < count; i++) {
      let {addr: sr} = utils.getAddressFromInt(i + 1000);
      let {addr: wk} = utils.getAddressFromInt(i + 2000);
      wks.push(wk);
      srs.push(sr);
    }        
    await smgSc.registerStart(groupId, start, workDuration, registerDuration, preGroupId, wks, srs);
    console.log("register group: %O", await smgSc.getStoremanGroupInfo(groupId));
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
    let data = smgSc.contract.methods.toSelect(groupId).encodeABI();
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
