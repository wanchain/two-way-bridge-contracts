const ConfigProxy = artifacts.require('ConfigProxy');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegate');
const { g, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, configProxy;
let data;

contract('Gpk_UNITs', async () => {
  let owner, admin;

  before("should do all preparations", async() => {
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

    // network
    await setupNetwork();

    owner = g.owner;
    admin = g.admin;
    console.log("onwer address: %s", owner);
    console.log("admin address: %s", admin);

    groupId = await registerStart(smgSc);
    let regTime = parseInt(new Date().getTime());
    let gi = await smgSc.getStoremanGroupInfo(groupId);
    await stakeInPre(smgSc, groupId);
    await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 2) * 1000);
    await toSelect(smgSc, groupId);

    data = new Data(smgSc, gpkSc, groupId);
    await data.init();
    // console.log("gpk ut data: %O", data);
  })

  // upgradeTo
  it('[GpkProxy_upgradeTo] should fail: Not owner', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: admin});
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
      await gpkSc.setDependence(configProxy.address, smgSc.address, {from: admin});
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
  it('[GpkDelegate_setPeriod] should fail: not admin', async () => {
    let result = {};
    let ployCommitPeroid = 10 * 60;
    let defaultPeroid = 5 * 60;
    let negotiatePeroid = 15 * 60;
    try {
      await gpkSc.setPeriod(groupId, ployCommitPeroid, defaultPeroid, negotiatePeroid, {from: owner});
    } catch (e) {
      result = e;
      console.log("setPeriod not admin: %O", e)
    }
    assert.equal(result.reason, 'not admin');
  })
  
  it('[GpkDelegate_setPeriod] should success', async () => {
    let result = {};
    let ployCommitPeriod = 10 * 60;
    let defaultPeriod = 5 * 60;
    let negotiatePeriod = 15 * 60;
    try {
      await gpkSc.setPeriod(groupId, ployCommitPeriod, defaultPeriod, negotiatePeriod, {from: admin});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let info = await gpkSc.getGroupInfo(groupId, -1);
    assert.equal(info.ployCommitPeriod, ployCommitPeriod);
    assert.equal(info.defaultPeriod, defaultPeriod);
    assert.equal(info.negotiatePeriod, negotiatePeriod);
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
      await data.setPolyCommit(1, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid round');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid curve', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 2, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid curve');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid sender', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 0, owner);
    } catch (e) {
      result = e;
      console.log("setPolyCommit Invalid sender: %O", e)
    }
    assert.equal(result.reason, 'Invalid sender');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Duplicate', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await data.setPolyCommit(0, 0, 0);
      await data.setPolyCommit(0, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Duplicate');
  })

  it('[GpkDelegate_setPolyCommit] should success', async () => {
    let result = {};
    try {
      for (let i = 1; i < data.smList.length; i++) {
        await data.setPolyCommit(0, 0, i);
      }
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Negotiate);
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
    }
    assert.equal(result.reason, 'Invalid storeman');
  })

  it('[GpkDelegate_setEncSij] should success', async () => {
    let result = {};
    try {
      await data.setEncSij(0, 0, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let sender = data.smList[0].address;
    let info = await gpkSc.getSijInfo(groupId, 0, 0, sender, sender);
    assert.equal(info.encSij, data.round[0].src[0].send[0].encSij);    
  })

  it('[GpkDelegate_setEncSij] should fail: Duplicate', async () => {
    let result = {};
    try {
      await data.setEncSij(0, 0, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Duplicate');
  })

  it('[GpkDelegate_setCheckStatus] should success', async () => {
    let result = {};
    try {
      await data.setCheckStatus(0, 0, 0, true, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let sender = data.smList[0].address;
    let info = await gpkSc.getSijInfo(groupId, 0, 0, sender, sender);
    assert.equal(info.checkStatus, CheckStatus.Valid);
  })

  it('[GpkDelegate_setEncSij_curve_1] should success', async () => {
    let result = {};
    try {
      for (let s = 0; s < data.smList.length; s++) {
        let d = s > 0? 0 : 1;
        for (; d < data.smList.length; d++) {
          await data.setEncSij(0, 0, d, s);
          await data.setCheckStatus(0, 0, s, true, d);
        }
      }
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Complete);
  })

  it('[GpkDelegate_curve_2] should success', async () => {
    let result = {};
    try {
      // polyCommit
      for (let i = 0; i < data.smList.length; i++) {
        await data.setPolyCommit(0, 1, i);
      }
      let info = await gpkSc.getGroupInfo(groupId, 0);
      assert.equal(info.curve2Status, GpkStatus.Negotiate);
      // sij
      for (let s = 0; s < data.smList.length; s++) {
        for (let d = 0; d < data.smList.length; d++) {
          await data.setEncSij(0, 1, d, s);
          await data.setCheckStatus(0, 1, s, true, d);
        }
      }
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve2Status, GpkStatus.Complete);
  })
})
