const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert  = require('assert')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitEnd } = require('../base.js')



contract('StoremanGroupDelegate unregister', async () => {
 
    let  smg
    let groupId
    let groupId2
    let groupInfo;
    

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);

        console.log(" XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX unregister groupInfo: ", groupInfo)


    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('T7 storemanGroupUnregister from none-leader', async ()=>{
        let tx =  smg.storemanGroupUnregister(groupId);
        await expectRevert(tx, 'Sender is not allowed')
    })
    it('T8 storemanGroupUnregister before endTime', async ()=>{
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("groupId: ", groupId)

        let block = await web3.eth.getBlock('latest')
        let now = block.timestamp
        console.log("now : ", now)
        let tx = smg.storemanGroupUnregister(groupId, {from:g.leader});
        await expectRevert(tx, "not expired")
    })
    it('T9 storemanGroupUnregister after endTime', async ()=>{
        await timeWaitEnd(groupInfo)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("before grupInfo:", groupInfo)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin});
        let tx = await smg.storemanGroupUnregister(groupId, {from:g.leader});
        console.log("tx:", tx.logs[0]) 
        expectEvent(tx, 'StoremanGroupUnregisterEvent', {groupId:groupId})
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("after grupInfo:", groupInfo)
        assert.equal(groupInfo.status, g.storemanGroupStatus.unregistered, 'storemanGroupUnregister failed')    

        tx =  smg.storemanGroupUnregister(groupId, {from:g.leader});
        await expectRevert(tx, "Invalid status");
    })
    


})
