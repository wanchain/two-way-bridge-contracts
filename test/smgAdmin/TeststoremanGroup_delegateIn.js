const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');



const { registerStart,stakeInPre, setupNetwork, g, timeWaitIncentive, toDelegateIn, sendTransaction} = require('../base.js');



contract('StoremanGroupDelegate delegateIn', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let delegateValue = 120
    let tester
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        tester = g.sfs[7]
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })

    it('T1 delegateIn normal', async ()=>{
        let sk = await smg.getStoremanInfo(wk.addr);
        console.log("sk:", sk);
        let tx = await smg.delegateIn(wk.addr,{value:delegateValue, from:tester});
        assert.equal(tx.receipt.logs[0].event, 'delegateInEvent')
        console.log("tx:", tx);
    })

    it('T2 delegateIn: small value', async ()=>{
        let tx =  smg.delegateIn(wk.addr,{value:10});
        await expectRevert(tx, "Too small value");       
    })

    it('delegateIncentiveClaim', async ()=>{
        
        await timeWaitIncentive(smg, groupId, wk.addr);
        let tx = await smg.delegateIncentiveClaim(wk.addr,{from:tester});
        expectEvent(tx, "delegateIncentiveClaimEvent", {wkAddr: web3.utils.toChecksumAddress(wk.addr), sender: web3.utils.toChecksumAddress(tester)})   
        
    })
})



contract('StoremanGroupDelegate delegateClaim', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    const base=40000
    const count=5



    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
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
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.failed, {from:g.admin})


        let smInfo = await smg.getStoremanInfo(wk.addr);

        d0 = utils.getAddressFromInt(base+0)
        d1 = utils.getAddressFromInt(base+1)
        d2 = utils.getAddressFromInt(base+2)
        d3 = utils.getAddressFromInt(base+3)
        d4 = utils.getAddressFromInt(base+4)

        // delete the first one,   0,1,2,3,4  -->  4,1,2,3
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d0, 0, sdata,smg.contract._address);
        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmDelegatorAddr(wk.addr, 3)
        assert.equal(addr.toLowerCase(), d3.addr)
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 4)

        // delete the last one 4,1,2,3  --->  4, 1, 2
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d3, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 3)

        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmDelegatorAddr(wk.addr, 2)
        assert.equal(addr.toLowerCase(), d2.addr)

        // delete the middle one 4, 1, 2  --> 4, 2
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d1, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 2)
        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmDelegatorAddr(wk.addr, 1)
        assert.equal(addr.toLowerCase(), d2.addr)

        let smInfo2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo.delegatorCount, 5)
        assert.equal(smInfo.delegateDeposit, 5*10000)
        assert.equal(smInfo2.delegatorCount, 2)
    })
    
})
