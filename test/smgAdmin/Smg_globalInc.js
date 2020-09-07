const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const Web3 = require('web3')

const { registerStart,stakeInPre, setupNetwork,toSelect, g, timeSetSelect,timeSet } = require('../base.js');



contract('TestSmg', async () => {

    let  smg
		let groupId, groupInfo
		let contValue = 123456;
		let web3 = new Web3(new Web3.providers.HttpProvider(g.web3url));
    let wk = utils.getAddressFromInt(10000)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId)

    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    it('stakeIn', async ()=>{
      let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:80000});
      console.log("tx:", tx);
  })
    it('prpare', async ()=>{
      await timeSetSelect(groupInfo);
      await toSelect(smg, groupId);
      await smg.updateGroupStatus(groupId,g.storemanGroupStatus.ready,{from:g.admin})
      await timeSet(parseInt(groupInfo.startTime)+3*g.timeBase)
    })

    it('incentive ', async ()=>{
        let tx = await smg.incentiveCandidator(wk.addr)
        console.log("incentiveCandidator:", tx.logs[0].args)
    })
    it('check incentive ', async ()=>{
      let I1 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime));
      console.log("I1:", I1)
      let I2 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime)+1);
      console.log("I2:", I2)
      let I3 = await smg.checkGroupIncentive(groupId, parseInt(groupInfo.startTime)+2);
      console.log("I3:", I3)
  })
    
})
