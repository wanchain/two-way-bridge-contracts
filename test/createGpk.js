const Web3 = require('web3')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const CreateGpkProxy = artifacts.require('CreateGpkProxy');
const CreateGpkDelegate = artifacts.require('CreateGpkDelegate');
const Encrypt = artifacts.require('Encrypt');
const { registerStart, stakeInPre, toSelect } = require('./base.js')

const web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.58:7654'));

// common
const ADDRESS_0 = '0x0000000000000000000000000000000000000000';

// group
let groupId = '';

// contract
let smgSc, gpkProxy, gpkDelegate, gpkSc;

contract('CreateGpk_UNITs', async ([a1, a2]) => {
  let owner = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';
  let someone = (a1 == owner)? a2 : a1;
  console.log("onwer address: %s", owner);
  console.log("someone address: %s", someone);

  before("should do all preparations", async() => {
    // unlock account
    await web3.eth.personal.unlockAccount(owner, 'wanglu', 99999);
    await web3.eth.personal.unlockAccount(someone, 'wanglu', 99999);

    // smg
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("StoremanGroup contract address: %s", smgProxy.address);

    // gpk
    gpkProxy = await CreateGpkProxy.deployed();
    gpkDelegate = await CreateGpkDelegate.deployed();
    gpkSc = await CreateGpkDelegate.at(gpkProxy.address);
    console.log("CreateGpk contract address: %s", gpkProxy.address);

    encryptSc = await Encrypt.deployed();

    groupId = await registerStart(smgSc);
    await stakeInPre(smgSc, groupId);
    await toSelect(smgSc, groupId);
  })

  // upgradeTo
  it('[CreateGpkProxy_upgradeTo] should fail: not owner', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: someone});
    } catch (e) {
      result = e;
      console.log(e);
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[CreateGpkProxy_upgradeTo] should fail: invalid implementation address', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to invalid address');
  })

  it('[CreateGpkProxy_upgradeTo] should success', async () => {
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

  it('[CreateGpkProxy_upgradeTo] should fail: duplicate upgrade', async () => {
    let result = {};
    try {
      await gpkProxy.upgradeTo(gpkDelegate.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Cannot upgrade to the same implementation');
  })

  // setDependence
  it('[CreateGpkDelegate_setDependence] should fail: not owner', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(smgSc.address, {from: someone});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Not owner');
  })

  it('[CreateGpkDelegate_setDependence] should fail: invalid smg address', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(ADDRESS_0, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, 'Invalid smg');
  })
  
  it('[CreateGpkDelegate_setDependence] should success', async () => {
    let result = {};
    try {
      await gpkSc.setDependence(smgSc.address, {from: owner});
    } catch (e) {
      result = e;
    }
    assert.equal(result.reason, undefined);
    assert.equal(await gpkSc.smg.call(), smgSc.address);
  })

  // setPeriod
  it('[CreateGpkDelegate_setPeriod] should fail: not owner', async () => {
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
  
  it('[CreateGpkDelegate_setPeriod] should success', async () => {
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
})
