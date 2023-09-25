const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, setupNetwork, g ,deploySmg} = require('../base.js');



contract('TestSmg', async () => {

    let  smg
		let groupId, groupInfo
		let contValue = 123456;
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

		it('T1 contribute', async ()=>{
			let tx = await smg.contribute({value:contValue})
			//expectEvent(tx, 'storemanGroupContributeEvent', {sender: web3.utils.toChecksumAddress(g.owner), value: new BN(contValue)})
      			await tx.wait()
		})
    it('T2 getGlobalIncentive', async ()=>{
				let tx = await smg.getGlobalIncentive();
				assert(contValue, Number(tx), "getGlobalIncentive failed");
        console.log("tx:", tx);
    })

    it('T3 getGlobalIncentive', async ()=>{
      let tx = await smg.getStoremanConf();
      console.log("tx:", tx);
    })

    it('T4 ChainTypeCo', async ()=>{
      let ret;
      await smg.setChainTypeCo(1, 2, 100);
      ret = await smg.getChainTypeCo(1,2);
      assert(Number(ret), 100, "setChainTypeCo failed")

      await smg.setChainTypeCo(4, 3, 200);
      ret = await smg.getChainTypeCo(4,3);
      assert(Number(ret), 200, "setChainTypeCo failed")

      await smg.setChainTypeCo(3, 4, 300);
      ret = await smg.getChainTypeCo(3,4);
      assert(Number(ret), 300, "setChainTypeCo failed")
      ret = await smg.getChainTypeCo(4,3);
      assert(Number(ret), 300, "setChainTypeCo failed")

      await smg.setChainTypeCo(3, 3, 200);
      ret = await smg.getChainTypeCo(3,3);
      assert(Number(ret), 200, "setChainTypeCo failed")

    })

    it('T5 smgTransfer', async ()=>{
      const value = 4000;
      let ret = await smg.smgTransfer(groupId, {value:value});
      console.log("tx:", ret);

      let sks = await smg.getSelectedStoreman(groupId);
      assert.equal(sks.length, g.memberCountDesign, "memberCountDesign failed")

      for(let i=0; i<sks.length; i++){
        sk = await smg.getStoremanInfo(sks[i])
        assert.equal(sk.crossIncoming, value/g.memberCountDesign, "cross Incoming failed")
      }
    })

    it('T6 getThresholdByGrpId', async ()=>{
      let tx = await smg.getThresholdByGrpId(groupId);
      console.log("tx:", tx);
      assert(tx, g.threshold, "getThresholdByGrpId failed")
    })



    it('T9 recordSmSlash', async ()=>{
      let tx = smg.recordSmSlash( g.leader);
      await expectRevert(tx, "Sender is not allowed")
    })
    it('T10 updateStoremanConf', async ()=>{
      await smg.updateStoremanConf( 4, 16000, 20);

      let conf = await smg.getStoremanConf();

      assert.equal(conf.backupCount, 4)
      assert.equal(conf.standaloneWeight, 16000)
      assert.equal(conf.delegationMulti, 20)
    })
    it('T10 setDependence', async ()=>{
      smg = smg.connect(g.signerOwner)
      let tx = smg.setDependence( "0x0000000000000000000000000000000000000000",g.admin, g.admin, g.admin);
      await expectRevert(tx, "Invalid metricAddr address");

      tx = smg.setDependence(g.admin, "0x0000000000000000000000000000000000000000",g.admin, g.admin);
      await expectRevert(tx, "Invalid gpkAddr address");
      tx = smg.setDependence(g.admin,g.admin, "0x0000000000000000000000000000000000000000",g.admin);
      await expectRevert(tx, "Invalid quotaAddr address");
    })

    it('T8 setGpk', async ()=>{
      smg = smg.connect(g.signerAdmin)
      let tx = smg.setGpk(groupId, g.leaderPk, g.leaderPk);
      await expectRevert(tx, "Sender is not allowed")
    })
    it('T8 checkGroupDismissable', async ()=>{
      let f = await smg.checkGroupDismissable(groupId);
      console.log("tx checkGroupDismissable:", f)
    })
    it('T8 getStoremanGroupConfig', async ()=>{
      let f = await smg.getStoremanGroupConfig(groupId);
      console.log("tx getStoremanGroupConfig:", f)
    })
    
    
    it('T7 recordSmSlash', async ()=>{
      smg = smg.connect(g.signerOwner)
      await smg.setDependence(g.owner, g.owner, g.owner,g.leader);
      let tx = await smg.recordSmSlash(g.leader);
      console.log("tx:", tx);
      let sk = await smg.getStoremanInfo(g.leader);
      assert(sk.slashedCount, 1, "recordSmSlash failed")

      tx = await smg.recordSmSlash(g.leader);
      console.log("tx:", tx);
      sk = await smg.getStoremanInfo(g.leader);
      console.log("sk:", sk);
      assert(sk.slashedCount, 1, "recordSmSlash failed")
    })

    it('T7 setGpk', async ()=>{
      smg = smg.connect(g.signerOwner)
      await smg.setDependence(g.admin, g.admin, g.admin,g.admin);
      smg = smg.connect(g.signerAdmin)
      await smg.updateGroupStatus(groupId, g.storemanGroupStatus.selected)
      await smg.setGpk(groupId, g.leader, g.leader);
      groupInfo = await smg.getStoremanGroupInfo(groupId);
      assert.equal(groupInfo.status, g.storemanGroupStatus.ready,"setGpk")

    })
})
