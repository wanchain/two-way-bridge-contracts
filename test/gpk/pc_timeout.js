const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegateV2');
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

    let curves = [1,0,1]
    let algos  = [1,1,0]
    await gpkSc.setGpkCfg(groupId, curves, algos,{from:admin}) 


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

  // when allow many gpk, the gpk count init at the first policommit.
  it('[GpkDelegate_polyCommitTimeout] should fail: Invalid curve', async () => {
    let result = {};
    try {
      await toSelect(smgSc, groupId);
      let count = await gpkSc.getGpkCount(groupId);
      console.log("count:", count.toString())
      await gpkSc.polyCommitTimeout(groupId, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid curve');
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
    for(let i=0; i<data.gpkCount; i++) {
      let info = await gpkSc.getGroupInfobyIndex(groupId, 0, i);
      assert.equal(info.curveStatus, GpkStatus.Close);
    }
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
