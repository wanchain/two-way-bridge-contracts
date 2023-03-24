const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegateV2');
const FakeSkCurve = artifacts.require('FakeSkCurve');
const { g, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, SlashType, Data } = require('./Data');
const utils = require('../utils.js');
const optimist = require("optimist");

const fakeSc = ['local', 'coverage'].includes(optimist.argv.network);

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, skCurve;
let data;

contract('Gpk_UT_sij_invalid_pc', async () => {
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
    await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 5) * 1000);
    await toSelect(smgSc, groupId);

    let curves = [1,0,1]
    let algos  = [1,1,0]
    await gpkSc.setGpkCfg(groupId, curves, algos,{from:admin}) 


    data = new Data(smgSc, gpkSc, groupId);
    await data.init();
    // console.log("gpk ut data: %O", data);

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

  // setEncSij
  it('[GpkDelegate_setEncSij] should success', async () => {
    let result = {};
    try {
      await data.setEncSij(0, 0, 1, 0);
      await data.setCheckStatus(0, 0, 0, false, 1);
    } catch (e) {
      result = e;
    }
    let src = data.smList[0].address;
    let dest = data.smList[1].address;
    let info = await gpkSc.getSijInfo(groupId, 0, 0, src, dest);
    assert.equal(info.encSij, data.round[0].src[0].send[1].encSij);
    assert.equal(info.checkStatus, CheckStatus.Invalid);
  })

  // revealSij
  it('[GpkDelegate_revealSij] should success', async () => {
    if (fakeSc) {
      let result = {};
      let src = data.smList[0].address;
      let dest = data.smList[1].address;
      try {
        await skCurve.setCalPolyCommitResult(false);
        result = await gpkSc.revealSij(groupId, 0, 0, dest, data.round[0].src[0].send[1].sij, data.round[0].src[0].send[1].ephemPrivateKey, {from: src});
      } catch (e) {
        result = e;
      }
      let event = result.logs[1].args;
      assert.equal(event.slashed.toLowerCase(), src.toLowerCase());
      assert.equal(event.slashType.toString(), SlashType.SijInvalid);
    }
  })
})
