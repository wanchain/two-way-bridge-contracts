const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert  = require('assert')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { registerStart,registerStart2,stakeInPre, sendIncentive,g, toSelect,setupNetwork, timeSet } = require('../base.js')



contract('StoremanGroupDelegate', async () => {
 
    let  smg
    let groupId
    let groupId2
    let groupInfo,groupInfo2;
    

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg, 0, {htlcDuration: 900});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('T7 storemanGroupUnregister from none-leader', async ()=>{
        let tx =  smg.storemanGroupUnregister(groupId);
        await expectRevert(tx, 'Sender is not allowed')
    })
    it('T8 storemanGroupUnregister before endTime', async ()=>{
        let tx = smg.storemanGroupUnregister(groupId, {from:g.leader});
        await expectRevert(tx, "not expired")
    })
    it('T9 storemanGroupUnregister after endTime', async ()=>{
        await timeSet(Number(groupInfo.endTime)+1);
        let tx = await smg.storemanGroupUnregister(groupId, {from:g.leader});
        console.log("tx:", tx) 
        expectEvent(tx, 'StoremanGroupUnregisterEvent', {groupId:groupId})
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("after grupInfo:", groupInfo)
        assert.equal(groupInfo.status, g.storemanGroupStatus.unregistered, 'storemanGroupUnregister failed')
        

    })
    


})
