const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const Web3 = require('web3')


const { registerStart,stakeInPre, setupNetwork, g } = require('../base.js');



contract('TestSmg', async () => {

    let  smg
		let groupId
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
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

		it('T1 contribute', async ()=>{
			let tx = await smg.contribute({value:contValue, from: g.owner})
			expectEvent(tx, 'storemanGroupContributeEvent', {sender: web3.utils.toChecksumAddress(g.owner), value: new BN(contValue)})
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

    it('T7 recordSmSlash', async ()=>{
      await smg.setDependence(g.owner, g.owner, g.owner);
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


    
    
})
