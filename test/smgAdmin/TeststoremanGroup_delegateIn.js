const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;


const { registerStart,stakeInPre, setupNetwork,g, toPartIn,toDelegateIn, toSelect, expectRevert,expectEvent,deploySmg, timeWaitIncentive,timeWaitSelect,toSetGpk, timeWaitEnd} = require('../base.js')



contract('StoremanGroupDelegate delegateIn', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let delegateValue = 120
    let tester
    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        tester = g.signers[8]  //g.sfs[7];
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg, 0, {registerDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:50000});
    })

    it('T1 delegateIn normal', async ()=>{
        let sk = await smg.getStoremanInfo(wk.addr);
        //console.log("sk:", sk);
        let tx = await smg.connect(tester).delegateIn(wk.addr,{value:delegateValue});
        // assert.equal(tx.receipt.logs[0].event, 'delegateInEvent')
        // console.log("tx:", tx);
        await expectEvent(g.storemanLib, tx, 'delegateInEvent')
    })

    it('T2 delegateIn: small value', async ()=>{
        let tx =  smg.delegateIn(wk.addr,{value:10});
        await expectRevert(tx, "Too small value");       
    })
    it('T3 delegateIn: to whitelist before select', async ()=>{
        let tx = await smg.delegateIn(g.leader,{value:100});
        await expectEvent(g.storemanLib, tx, 'delegateInEvent')
    })
    it('delegateIn to unselected node after select', async ()=>{
        await toSelect(smg, groupId);
        let ginfo1 = await smg.getStoremanGroupInfo(groupId)
        let tx = await smg.delegateIn(wk2.addr,{value:100});
        await expectEvent(g.storemanLib, tx, 'delegateInEvent') 
        let ginfo2 = await smg.getStoremanGroupInfo(groupId)
        assert.equal(ginfo1.deposit.toString(), ginfo2.deposit.toString())
        //assert.equal(ginfo1.deposit.mul(15000).div(10000), ginfo1.depositWeight)
    })
    it('delegateIncentiveClaim', async ()=>{
        
        await timeWaitIncentive(smg, groupId, wk.addr);
        let tx = await smg.connect(tester).delegateIncentiveClaim(wk.addr);
        // expectEvent(tx, "delegateIncentiveClaimEvent", {wkAddr: web3.utils.toChecksumAddress(wk.addr), sender: web3.utils.toChecksumAddress(tester)})   
        await expectEvent(g.storemanLib, tx, 'delegateIncentiveClaimEvent',[wk.addr, tester.address, null]) 
    })
})



contract('StoremanGroupDelegate delegateClaim', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    const base=40
    const count=5



    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await toDelegateIn(smg, wk.addr,index=base,count, value=10000)
        let smInfo = await smg.getStoremanInfo(wk.addr);
        console.log("stakeIn smInfo:", smInfo)
        assert.equal(smInfo.delegatorCount, 5)
    })  

    it('check incentive ', async ()=>{
        let sdata, addr;
        let smInfo1;
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.failed)

        let smInfo = await smg.getStoremanInfo(wk.addr);

        // delete the first one,   0,1,2,3,4  -->  4,1,2,3
        await smg.connect(g.signers[base+0]).delegateClaim(wk.addr)
        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr, g.signers[base+4].address)
        addr = await smg.getSmDelegatorAddr(wk.addr, 3)
        assert.equal(addr, g.signers[base+3].address)
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 4)

        // delete the last one 4,1,2,3  --->  4, 1, 2
        await smg.connect(g.signers[base+3]).delegateClaim(wk.addr)
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 3)

        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr, g.signers[base+4].address)
        addr = await smg.getSmDelegatorAddr(wk.addr, 2)
        assert.equal(addr, g.signers[base+2].address)

        // delete the middle one 4, 1, 2  --> 4, 2
        await smg.connect(g.signers[base+1]).delegateClaim(wk.addr)
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 2)
        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr, g.signers[base+4].address)
        addr = await smg.getSmDelegatorAddr(wk.addr, 1)
        assert.equal(addr, g.signers[base+2].address)

        let smInfo2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo.delegatorCount, 5)
        assert.equal(smInfo.delegateDeposit, 5*10000)
        assert.equal(smInfo2.delegatorCount, 2)
    })
    
})

contract('StoremanGroupDelegate reuse', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    const base=40
    const count=1



    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await toDelegateIn(smg, wk.addr,index=base,count, value=10000)
        await toPartIn(smg, wk2.addr,index=base,count, value=10000)
    })  

    it('check incentive ', async ()=>{
        let sdata, tx;
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.failed)

        let groupId2 = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        tx = smg.stakeIn(groupId2, wk.pk, wk.pk,{value:100000});
        await expectRevert(tx, "Candidate has existed")

        tx = smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});
        await expectRevert(tx, "Candidate has existed")   

        await smg.connect(g.signers[base]).delegateClaim(wk.addr)

        await smg.connect(g.signers[base]).partClaim(wk2.addr)
        let sk = await smg.getStoremanInfo(wk.addr)
        //console.log("sk:",sk)
        await smg.connect(g.signerAdmin).stakeClaim(wk.addr);
        await smg.connect(g.signerAdmin).stakeClaim(wk2.addr);

        tx = await smg.stakeIn(groupId2, wk.pk, wk.pk,{value:100000});
        await expectEvent(g.storemanLib, tx, 'stakeInEvent')

        tx = await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});
        await expectEvent(g.storemanLib, tx, 'stakeInEvent')
        
    })
    
})




contract('StoremanGroupDelegate delegateOut, delegateClaim in sk', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    const base=40
    const count=4



    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await toDelegateIn(smg, wk.addr,index=base,count, value=10000)
        await toPartIn(smg, wk.addr,index=base,count, value=10000)
    })  

    it('check incentive ', async ()=>{
        let sdata, tx;
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.ready)
        await smg.connect(g.signers[base]).delegateOut(wk.addr)
        await smg.connect(g.signers[base]).partOut(wk.addr)
        await smg.connect(g.signers[base+1]).delegateOut(wk.addr)
        await smg.connect(g.signers[base+1]).partOut(wk.addr)        
        await smg.connect(g.signers[base+2]).delegateOut(wk.addr)
        await smg.connect(g.signers[base+2]).partOut(wk.addr)
        await smg.connect(g.signers[base+3]).delegateOut(wk.addr)
        await smg.connect(g.signers[base+3]).partOut(wk.addr)
        let groupId2 = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000, preGroupId:groupId});
        //await timeWaitEnd(groupInfo)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.failed)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId2, g.storemanGroupStatus.ready)
        tx =  await smg.connect(g.signers[base]).delegateClaim(wk.addr)
        tx =  await smg.connect(g.signers[base]).partClaim(wk.addr)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.none)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId2, g.storemanGroupStatus.ready)
        tx = await smg.connect(g.signers[base+1]).delegateClaim(wk.addr)
        tx = await smg.connect(g.signers[base+1]).partClaim(wk.addr)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.dismissed)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId2, g.storemanGroupStatus.dismissed)
        await smg.connect(g.signers[base+2]).delegateClaim(wk.addr)
        await smg.connect(g.signers[base+2]).partClaim(wk.addr)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.ready)
        await smg.connect(g.signerAdmin).updateGroupStatus(groupId2, g.storemanGroupStatus.ready)
        tx =  smg.connect(g.signers[base+3]).delegateClaim(wk.addr)
        await expectRevert(tx, 'Cannot claim')
        tx = smg.connect(g.signers[base+3]).partClaim(wk.addr)
        await expectRevert(tx, 'Cannot claim')
       
    })
    
})






contract('StoremanGroupDelegate TestIncentive', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        groupId = await registerStart(smg, 0, {htlcDuration:5,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        let value=100000
        await g.testIncentive1.delegateIn(wk.addr,{value})
        await g.testIncentive2.delegateIn(wk.addr,{value})
        await g.testIncentive3.partIn(wk.addr,{value})
        await g.testIncentive4.stakeIn(groupId, wk1.pk, wk1.pk,{value});
        await g.testIncentive5.stakeIn(groupId, wk2.pk, wk2.pk,{value});
    })  

    it('check incentive ', async ()=>{
        let sdata, tx;
        await toSetGpk(smg, groupId);
        await g.testIncentive1.delegateOut(wk.addr)
        await g.testIncentive2.delegateOut(wk.addr)
        await g.testIncentive3.partOut(wk.addr)
        await g.testIncentive4.stakeOut(wk1.addr)
        await g.testIncentive5.stakeOut(wk2.addr)

        await smg.connect(g.signerAdmin).updateGroupStatus(groupId, g.storemanGroupStatus.failed)

        tx =  g.testIncentive1.delegateClaim(wk.addr)
        //await expectRevert(tx, 'ReentrancyGuard: reentrant call')
        tx =  g.testIncentive2.delegateClaim(wk.addr, {gasLimit:1e7})
        //await expectRevert(tx, 'ReentrancyGuard: reentrant call')
        tx =  g.testIncentive3.partClaim(wk.addr)
        //await expectRevert(tx, 'ReentrancyGuard: reentrant call')
        tx =  g.testIncentive4.stakeClaim(wk1.addr)
        //await expectRevert(tx, 'ReentrancyGuard: reentrant call')
        tx =  g.testIncentive5.stakeClaim(wk2.addr)
        //await expectRevert(tx, 'ReentrancyGuard: reentrant call')
    })
    
})