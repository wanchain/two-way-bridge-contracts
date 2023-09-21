const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, setupNetwork, g, timeWaitSelect, toSelect } = require('../base.js');

const sleep = (ms)=>new Promise(resolve=>setTimeout(resolve,ms))


contract('TestSmg', async () => {

    let  smg
		let groupId, groupInfo

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('set timestamp ', async ()=>{
      let t = await smg.getStakeOutRevertTimestamp()
      assert(t.toString(), 0, 'get timestamp error')

      let cur = parseInt(Date.now()/1000)
      let tx = smg.setStakeOutRevertTimestamp(cur, {from: g.owner})
      await expectRevert(tx, 'not admin')
      await smg.setStakeOutRevertTimestamp(cur, {from: g.admin})

      t = await smg.getStakeOutRevertTimestamp()
      assert(t.toString(), cur.toString(), 'get timestamp error')
    })

    it('stakeInPre ', async ()=>{
      groupId = await registerStart(smg);
      groupInfo = await smg.getStoremanGroupInfo(groupId);
      await stakeInPre(smg, groupId)
    })
    it('revert', async ()=>{
      console.log("g.wks", g.wks)
      let cur = parseInt(Date.now()/1000)+10
      await smg.setStakeOutRevertTimestamp(cur, {from: g.admin})
      t = await smg.getStakeOutRevertTimestamp()
      assert(t.toString(), cur.toString(), 'get timestamp error')

      await timeWaitSelect(groupInfo);
      await toSelect(smg, groupId);
      await smg.stakeOut(g.wks[0], {from: g.sfs[0]});
      let wk = await smg.getStoremanInfo(g.wks[0])
      //console.log("wk:", wk)
      assert(wk.wkAddr, true, 'stakeOut failed')
      let tx = await smg.stakeOutRevert(g.wks[0], {from: g.sfs[0]});
      //console.log("tx:", tx)
      expectEvent(tx, 'stakeOutRevertEvent', {wkAddr: g.wks[0], from: g.sfs[0]})
      wk = await smg.getStoremanInfo(g.wks[0])
      //console.log("wk:", wk)
      assert(wk.wkAddr, false, 'stakeOutRevert failed')
      tx = smg.stakeOutRevert(g.wks[0], {from: g.sfs[1]});
      await expectRevert(tx, "Only the sender can stakeOutRevert")

      await sleep(10000)
      tx = smg.stakeOutRevert(g.wks[0], {from: g.sfs[0]});
      await expectRevert(tx, 'invalid time')
    })

})
