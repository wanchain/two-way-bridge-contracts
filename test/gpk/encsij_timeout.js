const ConfigProxy = artifacts.require('ConfigProxy');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegate');
const FakeSkCurve = artifacts.require('FakeSkCurve');
const { g, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');
const { sleep } = require('promisefy-util');
const optimist = require("optimist");

const fakeSc = ['local', 'coverage'].includes(optimist.argv.network);

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, configProxy, skCurve;
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

    // curve
    if (fakeSc) {
      skCurve = await FakeSkCurve.deployed();
    }

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

    await gpkSc.setPeriod(groupId, 10, 10, 10, {from: g.admin});
  })

  // setPolyCommit
  it('[GpkDelegate_setPolyCommit] should fail: Gpk failed', async () => {
    await data.setPolyCommit(0, 0, 0);
    if (fakeSc) {
      let result = {};
      try {
        await skCurve.setAddResult(false);
        await data.setPolyCommit(0, 0, 1);
      } catch (e) {
        result = e;
      }
      assert.equal(result.reason, 'Gpk failed');
    }
  })

  it('[GpkDelegate_setPolyCommit] should fail: PolyCommit failed', async () => {
    if (fakeSc) {
      let result = {};
      try {
        await skCurve.setAddResult(true);
        await skCurve.setCalPolyCommitResult(false);
        await data.setPolyCommit(0, 0, 1);
      } catch (e) {
        result = e;
      }
      assert.equal(result.reason, 'PolyCommit failed');
    }
  })

  it('[GpkDelegate_setPolyCommit] should fail: Add failed', async () => {
    if (fakeSc) {
      let result = {};
      try {
        await skCurve.setCalPolyCommitResult(true);
        await skCurve.setAddZeroFail(true);
        await data.setPolyCommit(0, 0, 1);
      } catch (e) {
        result = e;
      }
      assert.equal(result.reason, 'Add failed');
    }
  })

  it('[GpkDelegate_setPolyCommit] should success', async () => {
    let result = {};
    try {
      if (fakeSc) {
        await skCurve.setAddZeroFail(false);
        await skCurve.setCalPolyCommitResult(true);
      }
      for (let i = 1; i < data.smList.length; i++) {
        await data.setPolyCommit(0, 0, i);
      }
    } catch (e) {
      result = e;
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Negotiate);
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid status', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid status');
  })

  // encSijTimeout
  it('[GpkDelegate_encSijTimeout] should fail: Not late', async () => {
    let result = {};
    try {
      await gpkSc.encSijTimeout(groupId, 0, data.smList[0].address, {from: data.smList[0].address});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not late');
  })

  it('[GpkDelegate_encSijTimeout] should success', async () => {
    let result = {};
    try {
      await sleep(15 * 1000);
      await gpkSc.encSijTimeout(groupId, 0, data.smList[0].address, {from: data.smList[0].address});
    } catch (e) {
      result = e;
      console.log("polyCommitTimeout should success: %O", e);
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Close);
    assert.equal(info.curve2Status, GpkStatus.Close);
  })
})
