const Web3 = require('web3');
const ConfigProxy = artifacts.require('ConfigProxy');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegate');
const { registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');

const web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.58:7654'));

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, configProxy;
let data;

contract('Gpk_UNITs', async () => {
  let owner = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';
  let someone = '0x82ef7751a5460bc10f731558f0741705ba972f4e';
  console.log("onwer address: %s", owner);
  console.log("someone address: %s", someone);

  before("should do all preparations", async() => {
    // unlock account
    await web3.eth.personal.unlockAccount(owner, 'wanglu', 99999);
    await web3.eth.personal.unlockAccount(someone, 'wanglu', 99999);

    // config
    configProxy = await ConfigProxy.deployed();

    // smg
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("StoremanGroup contract address: %s", smgProxy.address);

    // gpk
    gpkProxy = await GpkProxy.deployed();
    gpkDelegate = await GpkDelegate.deployed();
    gpkSc = await GpkDelegate.at(gpkProxy.address);
    console.log("Gpk contract address: %s", gpkProxy.address);

    groupId = await registerStart(smgSc);
    await stakeInPre(smgSc, groupId);
    await toSelect(smgSc, groupId);

    data = new Data(smgSc, gpkSc, groupId);
    await data.init();
    // console.log("gpk ut data: %O", data);
  })

  // upgradeTo
  it('[GpkProxy_upgradeTo] should fail: Not owner', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: someone});
    } catch (e) {
      result = e;
      console.log(e);
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[GpkProxy_upgradeTo] should fail: Cannot upgrade to invalid address', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to invalid address');
  })

  it('[GpkProxy_upgradeTo] should success', async () => {
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

  it('[GpkProxy_upgradeTo] should fail: Cannot upgrade to the same implementation', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to the same implementation');
  })

  // setDependence
  it('[GpkDelegate_setDependence] should fail: Not owner', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(configProxy.address, smgSc.address, {from: someone});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[GpkDelegate_setDependence] should fail: Invalid cfg', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(ADDRESS_0, smgSc.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid cfg');
  })

  it('[GpkDelegate_setDependence] should fail: Invalid smg', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(configProxy.address, ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid smg');
  })
  
  it('[GpkDelegate_setDependence] should success', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(configProxy.address, smgSc.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    assert.equal(await gpkSc.smg.call(), smgSc.address);
  })

  // setPeriod
  it('[GpkDelegate_setPeriod] should fail: Not owner', async () => {
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
  
  it('[GpkDelegate_setPeriod] should success', async () => {
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

  // setPolyCommit
  it('[GpkDelegate_setPolyCommit] should fail: Invalid polyCommit', async () => {
    let result = {};
    try {
      await gpkSc.setPolyCommit(groupId, 0, 0, '0x');
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid polyCommit');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid round', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 1);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid round');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid curve', async () => {
    let result = {};
    try {
      await data.setPolyCommit(2, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid curve');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid sender', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid sender');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Duplicate', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await data.setPolyCommit(0, 0, 0, {from: sender});
      await data.setPolyCommit(0, 0, 0, {from: sender});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Duplicate');
  })

  it('[GpkDelegate_setPolyCommit] should success', async () => {
    let result = {};
    try {
      for (let i = 1; i < 4; i++) {
        let sender = data.smList[i].address;
        await data.setPolyCommit(0, i, 0, {from: sender});
      }
      let info = gpkSc.getGroupInfo(groupId, 0);
      assert.equal(info.curve1Status, GpkStatus.Negotiate);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
  })

  // setEncSij
  it('[GpkDelegate_setEncSij] should fail: Invalid encSij', async () => {
    let result = {};
    try {
      let src = data.smList[0].address;
      await gpkSc.setEncSij(groupId, 0, 0, src, '0x');
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid encSij');
  })

  it('[GpkDelegate_setEncSij] should fail: Invalid storeman', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await gpkSc.setEncSij(groupId, 0, 0, ADDRESS_0, '0x00', {from: sender});
    } catch (e) {
      result = e;
      console.log("setEncSij Invalid storeman: %O", e)
    }
    assert.equal(result.reason, 'Invalid storeman');
  })

  it('[GpkDelegate_setEncSij] should success', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await data.setEncSij(0, 0, 0, 0, {from: sender});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
  })

  it('[GpkDelegate_setEncSij] should fail: Duplicate', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await data.setEncSij(0, 0, 0, 0, {from: sender});
    } catch (e) {
      result = e;
      console.log("setEncSij Duplicate: %O", e)
    }
    assert.equal(result.reason, 'Duplicate');
  })
})
