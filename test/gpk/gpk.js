const ConfigProxy = artifacts.require('ConfigProxy');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegateV2 = artifacts.require('GpkDelegateV2');
const { g, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');
const optimist = require("optimist");

const assert = require('chai').assert;
const { expectRevert, expectEvent, BN} = require('@openzeppelin/test-helpers');

const fakeSc = ['local', 'coverage'].includes(optimist.argv.network);

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate,gpkDelegateV2, gpkSc, configProxy;
let data;

contract('Gpk_UT_gpk', async(accounts) => {
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

    gpkDelegate = await GpkDelegateV2.deployed();
    //await gpkProxy.upgradeTo(gpkDelegate.address)
    gpkSc = await GpkDelegateV2.at(gpkProxy.address);
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



    // console.log("gpk ut data: %O", data);

    let result = {};
    try {
      await gpkSc.setPolyCommit(groupId, 1, 0, Buffer.from("FFFF", 'hex'));
      console.log("OK")
    } catch (e) {
      console.log("xxx:e", e)
      result = e;
    }
    assert.equal(result.reason, 'Invalid gpk count');

    await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 5) * 1000);
    await toSelect(smgSc, groupId);

    let curves = [1,0,1]
    let algos  = [1,1,0]
    let tx = await gpkSc.setGpkCfg(groupId, curves, algos,{from:admin}) 
    let count = await gpkSc.gpkCount(groupId);
    console.log("gpk count:", count.toString(10))

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
    assert.equal(await gpkSc.smg.call(), smgSc.address);
  })

  // setPeriod
  it('[GpkDelegate_setPeriod] should fail: not admin', async () => {
    let result = {};
    let ployCommitPeroid = 10 * 60;
    let defaultPeroid = 5 * 60;
    let negotiatePeroid = 15 * 60;
    try {
      await   gpkSc.setPeriod(groupId, ployCommitPeroid, defaultPeroid, negotiatePeroid, {from: owner});
      //await expectRevert(tx, "not admin")
    } catch (e) {
      result = e;
      //console.log("setPeriod not admin: %O", e)
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
    let info = await gpkSc.groupMap(groupId);
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
      let tx = await data.setPolyCommit(1, 0, 0);
      console.log("tx:", tx)
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid round');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid curve', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 3, 0);
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
      //console.log("setPolyCommit Invalid sender: %O", e)
    }
    assert.equal(result.reason, 'Invalid sender');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Duplicate', async () => {
    let result = {};
    try {
      let sender = data.smList[0].address;
      await data.setPolyCommit(0, 0, 0);
      let info = await gpkSc.getPolyCommit(groupId, 0, 0, sender);
      assert.equal(info, data.round[0].src[0].pcStr);
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
    let info = await gpkSc.getGroupInfobyIndex(groupId, 0, 0);
    assert.equal(info.curveStatus, GpkStatus.Negotiate);
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
    let sender = data.smList[0].address;
    let info = await gpkSc.getSijInfo(groupId, 0, 0, sender, sender);
    assert.equal(info.checkStatus, CheckStatus.Valid);
  })

  it('[GpkDelegate_setCheckStatus] should fail: Duplicate', async () => {
    let result = {};
    try {
      await data.setCheckStatus(0, 0, 0, true, 0);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Duplicate');
  })

  it('[GpkDelegate_setCheckStatus] should fail: Not ready', async () => {
    let result = {};
    try {
      await data.setCheckStatus(0, 0, 0, true, 1);
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not ready');
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
    let info = await gpkSc.getGroupInfobyIndex(groupId, 0,0);
    assert.equal(info.curveStatus, GpkStatus.Complete);
    if (!fakeSc) {
      data.genGpk(0);
      let gpk = await gpkSc.getGpk(groupId);
      assert.equal(gpk.gpk1, data.round[0].gpk);
    }
  })

  it('[GpkDelegate_curve_2] should success', async () => {
    let result = {};
    // polyCommit
    for (let i = 0; i < data.smList.length; i++) {
      await data.setPolyCommit(0, 1, i);
    }
    let info = await gpkSc.getGroupInfobyIndex(groupId, 0, 1);
    assert.equal(info.curveStatus, GpkStatus.Negotiate);
    // sij
    for (let s = 0; s < data.smList.length; s++) {
      for (let d = 0; d < data.smList.length; d++) {
        await data.setEncSij(0, 1, d, s);
        await data.setCheckStatus(0, 1, s, true, d);
      }
    }
    info = await gpkSc.getGroupInfobyIndex(groupId, 0, 1);
    assert.equal(info.curveStatus, GpkStatus.Complete);
    console.log("fakeSc:", fakeSc)
    if (!fakeSc) {
      data.genGpk(1);
      let gpk = await gpkSc.getGpk(groupId);
      assert.equal(gpk.gpk2, data.round[1].gpk);
    }
  })

  it('[GpkDelegate_curve_3] should success', async () => {
    let result = {};
    // polyCommit
    for (let i = 0; i < data.smList.length; i++) {
      await data.setPolyCommit(0, 2, i);
    }
    let info = await gpkSc.getGroupInfobyIndex(groupId, 0, 2);
    assert.equal(info.curveStatus, GpkStatus.Negotiate);
    // sij
    for (let s = 0; s < data.smList.length; s++) {
      for (let d = 0; d < data.smList.length; d++) {
        await data.setEncSij(0, 2, d, s);
        await data.setCheckStatus(0, 2, s, true, d);
      }
    }
    for (let i = 0; i < data.smList.length; i++) {
      gpkShare = await gpkSc.getGpkSharebyIndex(groupId, 0, i);
      assert.notEqual(gpkShare, '');
      gpk = await gpkSc.getGpkbyIndex(groupId, i);
      assert.notEqual(gpk, '');
    }
    info = await gpkSc.getGroupInfobyRoundCurve(groupId, 0, 2);
    assert.equal(info.curveStatus, GpkStatus.Complete);

    console.log("fakeSc:", fakeSc)
    if (!fakeSc) {
      data.genGpk(1);
      let gpk = await gpkSc.getGpk(groupId);
      assert.equal(gpk.gpk2, data.round[1].gpk);
    }
  })
  it('[GpkDelegate_payable] should fail: Not support', async () => {
    let result = null;
    try {
      let fakeSC = await StoremanGroupDelegate.at(gpkProxy.address);
      await fakeSC.getStoremanGroupConfig(groupId);
    } catch (e) {
      result = e;
    }
    assert.notEqual(result, null)
  })  

  it('[GpkDelegate_setGpkCfgN] should fail 1: invalid length', async () => {
    console.log("GpkDelegate_setGpkCfgN:", accounts.length)
    let curves = []
    let algos = []
    let tx =  gpkSc.setGpkCfg(groupId, curves, algos,{from:accounts[3]})
    await expectRevert(tx, "not admin")

    tx =  gpkSc.setGpkCfg(groupId, curves, algos,{from:admin})
    await expectRevert(tx, "empty curve")

    curves = [1,0]
    tx =  gpkSc.setGpkCfg(groupId, curves, algos,{from:admin})
    await expectRevert(tx, "invalid length")

    curves = [1,0,1,8,37]
    algos  = [1, 1, 0,9,46]
    tx = await gpkSc.setGpkCfg(groupId, curves, algos,{from:admin})

    expectEvent(tx, "setGpkCfgEvent",{count: new BN(algos.length)})

    let count1 = await gpkSc.gpkCount(groupId);
    assert.equal(count1, algos.length, "getGpkCount failed")

    for(let i=0; i<count1; i++) {
      // let cfg = await gpkSc.getGpkCfgbyGroup(groupId, i);
      // console.log("cfg:", i, cfg.curveIndex.toString(10), cfg.algo.toString(10))
      // assert.equal(cfg.curveIndex.toString(10), curves[i].toString(10), "curve error")
      // assert.equal(cfg.algo.toString(10), algos[i].toString(10), "algo error")
    }
    console.log("end")

  })  

})
