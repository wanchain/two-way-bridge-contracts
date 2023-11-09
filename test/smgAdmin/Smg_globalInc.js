const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const Web3 = require('web3')

const { registerStart,stakeInPre, setupNetwork, g,toSetGpk ,deploySmg, timeWaitSelect, toSelect, timeWaitIncentive} = require('../base.js');



contract('TestSmg', async () => {

    let  smg
		let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)

    before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")
  })


  it('registerStart_1 ', async ()=>{
      groupId = await registerStart(smg);
      groupInfo = await smg.getStoremanGroupInfo(groupId);
      assert(groupInfo.groupId, groupId, 'groupInfo is error')
  })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    it('stakeIn', async ()=>{
      let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:80000});
      console.log("tx:", tx);
  })
    it('prpare', async ()=>{
      await timeWaitSelect(groupInfo);
      await toSelect(smg, groupId);
      await toSetGpk(smg,groupId);
    })


    it('check incentive ', async ()=>{
      await timeWaitIncentive(smg, groupId, wk.addr);

      let I1 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime));
      expect(I1.toString(), '30000000','Incentive failed')
      //console.log("I1:", I1)
      let I2 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime)+1);
      //console.log("I2:", I2)
      expect(I2.toString(), '30000000','Incentive failed')
      let I3 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime)+2);
      //console.log("I3:", I3)
      expect(I3.toString(), '30000000','Incentive failed')
  })
    
})

contract('incentive metric', async () => {

  let  smg
  let groupId, groupInfo
  let wk = utils.getAddressFromInt(10000)
  let wk2 = utils.getAddressFromInt(10002)
  let wk3 = utils.getAddressFromInt(10003)

  before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")
      groupId = await registerStart(smg, 0, {htlcDuration:10});
      groupInfo = await smg.getStoremanGroupInfo(groupId)
      await stakeInPre(smg, groupId)
  })



  it('stakeIn', async ()=>{
      await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
      await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
      await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:100000});

  })  


  it('prpare', async ()=>{
    await timeWaitSelect(groupInfo);
    await toSelect(smg, groupId);
    await toSetGpk(smg, groupId);

  })
  it('incentiveCandidator', async ()=>{
      let metric = g.fakeMetric
      // let gpkProxy = await GpkProxy.deployed();
      // let pos = await FakePosLib.deployed();
      // let quota = await fakeQuota.deployed();
      // await smg.setDependence(metric.address, gpkProxy.address, quota.address,pos.address);
      let second = parseInt(groupInfo.endTime)
      await utils.sleepUntil(second*1000)
      let tx = await smg.incentiveCandidator(wk.addr);

      await metric.setC0(8)
      await metric.setC1(8)
      tx = await smg.incentiveCandidator(wk2.addr);

      await metric.setC0(8)
      await metric.setC1(2)
      tx = await smg.incentiveCandidator(wk3.addr);   
  })


  
})
