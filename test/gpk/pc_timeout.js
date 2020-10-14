const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegate');
const { g, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');
const { sleep } = require('promisefy-util');

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc;
let data;

contract('Gpk_UT_pc_timeout', async () => {
  let owner, admin;

  before("should do all preparations", async() => {
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
    await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 5) * 1000);

    data = new Data(smgSc, gpkSc, groupId);
    await data.init();
    // console.log("gpk ut data: %O", data);

    await gpkSc.setPeriod(groupId, 10, 10, 10, {from: g.admin});
  })

  // polyCommitTimeout
  it('[GpkDelegate_setPolyCommit] should fail: Invalid stage', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid stage');
  })

  it('[GpkDelegate_polyCommitTimeout] should fail: Invalid status', async () => {
    let result = {};
    try {
      await toSelect(smgSc, groupId);
      await gpkSc.polyCommitTimeout(groupId, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid status');
  })

  it('[GpkDelegate_polyCommitTimeout] should fail: Not late', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 0);
      await gpkSc.polyCommitTimeout(groupId, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not late');
  })  

  it('[GpkDelegate_polyCommitTimeout] should success', async () => {
    let result = {};
    try {
      await sleep(15 * 1000);
      await gpkSc.polyCommitTimeout(groupId, 0);
    } catch (e) {
      result = e;
      console.log("polyCommitTimeout should success: %O", e);
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Close);
    assert.equal(info.curve2Status, GpkStatus.Close);
  })

  it('[GpkDelegate_polyCommitTimeout_round1] should failed', async () => {
    let result = {};
    try {
      await gpkSc.polyCommitTimeout(groupId, 1);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid status');
    let info = await gpkSc.groupMap(groupId);
    assert.equal(info.round, 1);
    assert.equal(info.smNumber, 0);
  })  
})
