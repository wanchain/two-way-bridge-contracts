const { g, curve1, curve2, setupNetwork, registerStart, stakeInPre, toSelect } = require('../base.js');
const { GpkStatus, CheckStatus, Data } = require('./Data');
const utils = require('../utils.js');
const { sleep } = require('promisefy-util');
const { assert } = require('chai');

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc;
let data;

contract('Gpk_UT_checksij_timeout', async () => {
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
    g.registerDuration = 15;
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
    // await utils.sleepUntil(regTime + (parseInt(gi.registerDuration) + 5) * 1000);
    await toSelect(smgSc, groupId);

    data = new Data(smgSc, gpkSc, groupId);
    await data.init();

    await gpkSc.connect(g.signerOwner).setDependence(cnf.address, smgSc.address);
    // await gpkSc.connect(g.signerAdmin).setPeriod(groupId, 10*60, 5*60, 15*60);
    await gpkSc.connect(g.signerAdmin).setPeriod(groupId, 10, 10, 10);
  })

  // setPolyCommit
  it('[GpkDelegate_setPolyCommit] should success', async () => {
    for (let i = 0; i < data.smList.length; i++) {
      await data.setPolyCommit(0, 0, i);
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Negotiate);
  })

  // checkSijTimeout
  it('[GpkDelegate_checkSijTimeout] should fail: Not ready', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerLeader).checkSijTimeout(groupId, 0, data.smList[0].address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Not ready');
  })

  it('[GpkDelegate_checkSijTimeout] should fail: Not late', async () => {
    let result = {};
    try {
      await data.setEncSij(0, 0, 0, 0);
      await data.setEncSij(0, 0, 1, 0);
      await gpkSc.connect(g.signerLeader).checkSijTimeout(groupId, 0, data.smList[0].address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Not late');
  })

  it('[GpkDelegate_encSijTimeout] should fail: Outdated', async () => {
    let result = {};
    try {
      await gpkSc.connect(g.signerLeader).encSijTimeout(groupId, 0, data.smList[0].address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Outdated');
  })

  it('[GpkDelegate_checkSijTimeout] should fail: Checked', async () => {
    let result = {};
    try {
      await data.setCheckStatus(0, 0, 0, true, 0);
      await gpkSc.connect(g.signerLeader).checkSijTimeout(groupId, 0, data.smList[0].address);
    } catch (e) {
      result = e;
    }
    assert.include(result.toString(), 'Checked');
  })

  it('[GpkDelegate_checkSijTimeout] should success', async () => {
    let result = {};
    try {
      await sleep(30 * 1000);
      await gpkSc.connect(g.signerLeader).checkSijTimeout(groupId, 0, data.smList[1].address);
    } catch (e) {
      result = e;
      // console.log("checkSijTimeout should success: %O", e);
    }
    let info = await gpkSc.getGroupInfo(groupId, 0);
    assert.equal(info.curve1Status, GpkStatus.Close);
    assert.equal(info.curve2Status, GpkStatus.Close);
  })
})
