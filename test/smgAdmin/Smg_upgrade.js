const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const Web3 = require('web3')


const { deploySmg,stakeInPre, setupNetwork, timeWaitSelect,toSelect,timeWaitIncentive,g } = require('../base.js');



contract('TestSmg', async () => {

    let  smgProxy
    let web3 = new Web3();
    before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")
      smgProxy =  g.storemanGroupProxy
      //console.log("xxxxxxxxxxxxxxxxxxxxxx: ", g.storemanGroupProxy)

    })

    it('T1 should failed. "Cannot upgrade to invalid address"', async ()=>{
      let tx =  smgProxy.upgradeTo("0x0000000000000000000000000000000000000000");
      await expectRevert(tx, "Cannot upgrade to invalid address")
    })
    it('T2 upgradeTo a valid address. should succeed', async ()=>{
      let tx =  smgProxy.upgradeTo(g.leader);
      //expectEvent(tx, 'Upgraded', {implementation:web3.utils.toChecksumAddress(g.leader)})
    })
    it('T3 should failed. "Cannot upgrade to the same implementation"', async ()=>{
      let tx =  smgProxy.upgradeTo(g.leader);
      await expectRevert(tx, "Cannot upgrade to the same implementation")
    })
    
    
})
