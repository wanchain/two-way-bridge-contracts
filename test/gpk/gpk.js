const { g, curve1, curve2, setupNetwork, registerStart, stakeInPre, toSelect, deploySmg } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');
const optimist = require("optimist");
const { ethers } = require('hardhat');
const { assert } = require('chai');

const fakeSc = ['local', 'coverage'].includes(optimist.argv.network);

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc, cnf;
let data;

contract('Gpk_UT_gpk', async(accounts) => {
  let owner, admin;

  before("should do all preparations", async() => {
    // config
    let ConfigDelegate = await ethers.getContractFactory("ConfigDelegate");
    cnf = await ConfigDelegate.deploy()
    await cnf.deployed();

    let FakeSkCurve = await ethers.getContractFactory("FakeSkCurve");
    secp256k1 = await FakeSkCurve.deploy();
    await secp256k1.deployed();
    let FakeBnCurve = await ethers.getContractFactory("FakeBnCurve");
    let bn256 = await FakeBnCurve.deploy();
    await bn256.deployed();

    // smg
    let CommonTool = await ethers.getContractFactory("CommonTool")
    let commonTool = await CommonTool.deploy()
    await commonTool.deployed()

    let StoremanUtil = await ethers.getContractFactory("StoremanUtil",{
      libraries:{
        CommonTool:commonTool.address,
      }
    })
    let storemanUtil = await StoremanUtil.deploy()
    await storemanUtil.deployed()
    g.storemanUtil = storemanUtil

    let StoremanLib = await ethers.getContractFactory("StoremanLib",{
      libraries:{
        StoremanUtil:storemanUtil.address,
      }
    })
    let storemanLib = await StoremanLib.deploy()
    await storemanLib.deployed()

    let IncentiveLib = await ethers.getContractFactory("IncentiveLib",{
      libraries:{
        StoremanUtil:storemanUtil.address,
      }
    })
    let incentiveLib = await IncentiveLib.deploy()
    await incentiveLib.deployed()

    let StoremanGroupDelegate = await ethers.getContractFactory("StoremanGroupDelegate",{
      libraries:{
        StoremanUtil:storemanUtil.address,
        StoremanLib:storemanLib.address,
        IncentiveLib:incentiveLib.address,
      }
    })
    smgSc = await StoremanGroupDelegate.deploy();
    await smgSc.deployed()
    g.storemanGroupProxy = smgSc

    let FakePosLib = await ethers.getContractFactory("FakePosLib")
    let fakePosLib = await FakePosLib.deploy()
    g.fakePosLib = fakePosLib
    await fakePosLib.deployed()
    let ListGroup = await ethers.getContractFactory("ListGroup",{
      libraries:{
        StoremanUtil:storemanUtil.address,
      }
    })
    let listGroup = await ListGroup.deploy(smgSc.address, fakePosLib.address)
    await listGroup.deployed()
    g.listGroup = listGroup

    let FakeQuota = await ethers.getContractFactory("fakeQuota")
    let fakeQuota = await FakeQuota.deploy()
    await fakeQuota.deployed()
    g.quota = fakeQuota
    let FakeMetric = await ethers.getContractFactory("FakeMetric")
    let fakeMetric = await FakeMetric.deploy()
    await fakeMetric.deployed()
    g.fakeMetric = fakeMetric

    await smgSc.setGlobalGroupScAddr(listGroup.address);

    // gpk
    let GpkProxy = await ethers.getContractFactory("GpkProxy")
    gpkProxy = await GpkProxy.deploy()
    await gpkProxy.deployed()
    let GpkLib = await ethers.getContractFactory("GpkLib",{
      libraries:{
        CommonTool:commonTool.address,
      }
    })
    let gpkLib = await GpkLib.deploy();
    await gpkLib.deployed();
    let GpkDelegate = await ethers.getContractFactory("GpkDelegate", {
      libraries : {
        GpkLib: gpkLib.address
      }
    });
    gpkDelegate = await GpkDelegate.deploy();
    await gpkDelegate.deployed();
    await gpkProxy.upgradeTo(gpkDelegate.address);
    gpkSc = await ethers.getContractAt('GpkDelegate', gpkProxy.address)
    // console.log("Gpk contract address: %s", gpkProxy.address);

    // network
    await setupNetwork();

    owner = g.owner;
    admin = g.admin;
    // console.log("onwer address: %s", owner);
    // console.log("admin address: %s", admin);

    let curveIdArray = [curve1, curve2];
    let algoIdArray = [0, 1];
    let curveAddrArray = [secp256k1.address, bn256.address];
    await cnf.addAdmin(admin);
    assert.equal(await cnf.mapAdmin(admin), true);
    await cnf.connect(g.signerAdmin).setCurve(curveIdArray, curveAddrArray);
    assert.equal(await cnf.getCurve(curve1), curveAddrArray[0]);
    assert.equal(await cnf.getCurve(curve2), curveAddrArray[1]);

    await smgSc.addAdmin(owner);
    await smgSc.setDependence(fakeMetric.address,gpkSc.address,fakeQuota.address,fakePosLib.address)
    groupId = await registerStart(smgSc);
    // console.log("storeman group started:", groupId);

    await gpkSc.addAdmin(admin);
    assert.equal(await gpkSc.mapAdmin(admin), true);
    await gpkSc.connect(g.signerAdmin).setGpkCfg(groupId, curveIdArray, algoIdArray);
    let gpkCount = await gpkSc.getGpkCount(groupId);
    assert.equal(gpkCount, 2);

    let regTime = parseInt(new Date().getTime());
    let gi = await smgSc.getStoremanGroupInfo(groupId);
    await stakeInPre(smgSc, groupId);
    await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 5) * 1000);
    await toSelect(smgSc, groupId);

    data = new Data(smgSc, gpkSc, groupId);
    await data.init();

    // console.log("gpk ut data: %O", data);

  })

  // upgradeTo
  it('[GpkProxy_upgradeTo] should fail: Not owner', async () => {
    let result = {};
    try {
      await gpkProxy.connect(g.signerAdmin).upgradeTo(gpkDelegate.address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Not owner');
  })

  it('[GpkProxy_upgradeTo] should fail: Cannot upgrade to invalid address', async () => {
    let result = {};
    try {
      await gpkProxy.connect(g.signerOwner).upgradeTo(ADDRESS_0);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Cannot upgrade to invalid address');
  })

  it('[GpkProxy_upgradeTo] should success', async () => {
    let result = {};
    try {
      await gpkProxy.connect(g.signerOwner).upgradeTo(gpkProxy.address); // set self address temporarily
      await gpkProxy.connect(g.signerOwner).upgradeTo(gpkDelegate.address);
    } catch (e) {
      result = e;
    }
    assert.equal(await gpkProxy.implementation(), gpkDelegate.address)
  })

  it('[GpkProxy_upgradeTo] should fail: Cannot upgrade to the same implementation', async () => {
    let result = {};
    try {
      await gpkProxy.connect(g.signerOwner).upgradeTo(gpkDelegate.address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Cannot upgrade to the same implementation');
  })

  // setDependence
  it('[GpkDelegate_setDependence] should fail: Not owner', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerAdmin).setDependence(cnf.address, smgSc.address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Not owner');
  })

  it('[GpkDelegate_setDependence] should fail: Invalid cfg', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerOwner).setDependence(ADDRESS_0, smgSc.address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Invalid cfg');
  })

  it('[GpkDelegate_setDependence] should fail: Invalid smg', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerOwner).setDependence(cnf.address, ADDRESS_0);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Invalid smg');
  })
  
  it('[GpkDelegate_setDependence] should success', async () => {
    await gpkSc.connect(g.signerOwner).setDependence(cnf.address, smgSc.address);
    assert.equal(await gpkSc.smg.call(), smgSc.address);
  })

  // setPeriod
  it('[GpkDelegate_setPeriod] should fail: not admin', async () => {
    let result = {};
    let ployCommitPeroid = 10 * 60;
    let defaultPeroid = 5 * 60;
    let negotiatePeroid = 15 * 60;
    try {
      await gpkSc.connect(g.signerOwner).setPeriod(groupId, ployCommitPeroid, defaultPeroid, negotiatePeroid);
    } catch (e) {
      result = e;
      // console.log("setPeriod not admin: %O", e)
    }
    assert.include(result.toString(), 'not admin');
  })
  
  it('[GpkDelegate_setPeriod] should success', async () => {
    let result = {};
    let ployCommitPeriod = 10 * 60;
    let defaultPeriod = 5 * 60;
    let negotiatePeriod = 15 * 60;
    try {
      await gpkSc.connect(g.signerAdmin).setPeriod(groupId, ployCommitPeriod, defaultPeriod, negotiatePeriod);
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
    assert.include(result.toString(), 'Invalid polyCommit');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid round', async () => {
    let result = {};
    try {
      let gpkGroupInfo = await gpkSc.getGroupInfo(groupId, "1");
      let invalidRoundIndex = (gpkGroupInfo.queriedRound + 1);
      await gpkSc.connect(g.signerLeader).setPolyCommit(groupId, invalidRoundIndex, 0, "0x01");
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Invalid round');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid curve', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 2, 0);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Invalid curve');
  })

  it('[GpkDelegate_setPolyCommit] should fail: Invalid sender', async () => {
    let result = {};
    try {
      await data.setPolyCommit(0, 0, 0, owner);
    } catch (e) {
      result = e;
      // console.log("setPolyCommit Invalid sender: %O", e)
    }
    assert.include(result.toString(), 'Invalid sender');
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
    assert.include(result.toString(), 'Duplicate');
  })

  it('[GpkDelegate_setPolyCommit] should success', async () => {
    for (let i = 1; i < data.smList.length; i++) {
      await data.setPolyCommit(0, 0, i);
    }
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
    assert.include(result.toString(), 'Invalid encSij');
  })

  it('[GpkDelegate_setEncSij] should fail: Invalid storeman', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerLeader).setEncSij(groupId, 0, 0, ADDRESS_0, '0x00');
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Invalid storeman');
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
    assert.include(result.toString(), 'Duplicate');
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
    assert.include(result.toString(), 'Duplicate');
  })

  it('[GpkDelegate_setCheckStatus] should fail: Not ready', async () => {
    let result = {};
    try {
      await data.setCheckStatus(0, 0, 0, true, 1);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Not ready');
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
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Complete);
    if (!fakeSc) {
      data.genGpk(0);
      let gpk = await gpkSc.getGpk(groupId);
      assert.equal(gpk.gpk1, data.round[0].gpk);
    }
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
      info = await gpkSc.getGpkShare(groupId, 0);
      assert.notEqual(info.gpkShare1, '');
      assert.notEqual(info.gpkShare2, '');
      info = await gpkSc.getGpk(groupId);
      assert.notEqual(info.gpk1, '');
      assert.notEqual(info.gpk2, '');
    } catch (e) {
      result = e;
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve2Status, GpkStatus.Complete);
    if (!fakeSc) {
      data.genGpk(1);
      let gpk = await gpkSc.getGpk(groupId);
      assert.equal(gpk.gpk2, data.round[1].gpk);
    }
  })

  it('[GpkDelegate_payable] should fail: Not support', async () => {
    let result = null;
    try {
      let fakeSC = await ethers.getContractAt("StoremanGroupDelegate", gpkProxy.address);
      await fakeSC.getStoremanGroupConfig(groupId);
    } catch (e) {
      result = e;
    }
    assert.notEqual(result, null)
  })  
})
