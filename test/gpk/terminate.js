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

contract('Gpk_UT_terminate', async () => {
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
    await toSelect(smgSc, groupId);

    let curves = [1,0,1]
    let algos  = [1,1,0]
    await gpkSc.setGpkCfg(groupId, curves, algos,{from:admin}) 


    data = new Data(smgSc, gpkSc, groupId);
    await data.init();
    // console.log("gpk ut data: %O", data);

    await gpkSc.setPeriod(groupId, 10, 10, 10, {from: g.admin});

  })

  // setPolyCommit
  it('[GpkDelegate_setPolyCommit] should success', async () => {
    let result = {};
    try {
      for (let i = 0; i < data.smList.length; i++) {
        await data.setPolyCommit(0, 0, i);
      }
    } catch (e) {
      result = e;
    }
    let info = await gpkSc.getGroupInfobyIndex(groupId, 0, 0);
    assert.equal(info.curveStatus, GpkStatus.Negotiate);
  })

  // terminate
  it('[GpkDelegate_terminate] should fail: Not late', async () => {
    let result = {};
    try {
      for (let d = 0; d < data.smList.length - 1; d++) {
        await data.setEncSij(0, 0, d, 0);
      }      
      await data.setCheckStatus(0, 0, 0, true, 0);
      await data.setCheckStatus(0, 0, 0, false, 1);
      await gpkSc.terminate(groupId, 0);
    } catch (e) {
      result = e;
      //console.log("terminate Not late: %O", e);
    }
    assert.equal(result.reason, 'Not late');
  })

  it('[GpkDelegate_terminate] should success', async () => {
    let result = {};
    try {
      await sleep(15 * 1000);
      await gpkSc.terminate(groupId, 0);
    } catch (e) {
      result = e;
      console.log("terminate should success: %O", e);
    }
    for(let i=0; i<data.gpkCount; i++) {
      let info = await gpkSc.getGroupInfobyIndex(groupId, 0, i);
      assert.equal(info.curveStatus, GpkStatus.Close);
    }

  })
})
