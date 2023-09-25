const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert  = require('assert')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { registerStart,stakeInPre, g, deploySmg,toSelect,setupNetwork, timeWaitEnd } = require('../base.js')



contract('StoremanGroupDelegate unregister', async () => {
 
    let  smg
    let groupId
    let groupId2
    let groupInfo;
    

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);

        console.log("  unregister groupInfo: ", groupInfo)


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
        let tx = smg.connect(g.signerLeader).storemanGroupUnregister(groupId);
        await expectRevert(tx, "not expired")
    })
    it('T9 storemanGroupUnregister after endTime', async ()=>{
        await timeWaitEnd(groupInfo)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("before grupInfo:", groupInfo)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.ready);
        let tx = await smg.connect(g.signerLeader).storemanGroupUnregister(groupId);
        tx = await tx.wait()
        console.log("tx:", tx.logs[0]) 
        //expectEvent(tx, 'StoremanGroupUnregisterEvent', {groupId:groupId})
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("after grupInfo:", groupInfo)
        assert.equal(groupInfo.status, g.storemanGroupStatus.unregistered, 'storemanGroupUnregister failed')    

        tx =  smg.connect(g.signerLeader).storemanGroupUnregister(groupId);
        await expectRevert(tx, "Invalid status");
    })
    


})
