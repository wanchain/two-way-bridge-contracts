const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');



const { registerStart,stakeInPre, setupNetwork, g, timeWaitIncentive, toDelegateIn,toSelect, toPartIn,sendTransaction} = require('../base.js');



contract('StoremanGroupDelegate delegateIn', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
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
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:50000});
    })

    it('T0 partIn [normalValue]', async ()=>{
        let partValue = 10000
        let sk = await smg.getStoremanInfo(wk.addr);
        let tx = await smg.partIn(wk.addr,{value:partValue, from:g.sfs[0]});
        expectEvent(tx, 'partInEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[0]), value:new BN(partValue)})
        let sk2 = await smg.getStoremanInfo(wk.addr);

        console.log("sk in T0 partIn [normalValue]",sk);
        console.log("sk2 in T0 partIn [normalValue]",sk2);
        assert.equal(sk.partnerCount, 0)
        assert.equal(sk.partnerDeposit, 0)
        assert.equal(sk2.partnerCount, 1)
        assert.equal(sk2.partnerDeposit, partValue)
        assert.equal(sk2.deposit, 50000)
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
        let tx =   smg.delegateIn(wk.addr,{value:10});
        await expectRevert(tx, "Too small value");
    })

    // default 5*(50000+10000)
    it('T2 delegateIn: on the range value.', async ()=>{
        let ret = await smg.getStoremanConf();
        console.log("backupCount:%s,standaloneWeight:%s,delegationMulti:%s",
            ret["backupCount"],
            ret["standaloneWeight"],
            ret["delegationMulti"]);

        let tx =  await smg.delegateIn(wk.addr,{value:parseInt(ret["delegationMulti"])*(50000+10000)-delegateValue,from:tester});
        assert.equal(tx.receipt.logs[0].event, 'delegateInEvent')
        console.log("tx:", tx);
    })
    it('T2 delegateIn: out of range value', async ()=>{
        let tx =  smg.delegateIn(wk.addr,{value:delegateValue});
        await expectRevert(tx, "Too many delegation");
    })

    it('T3 delegateIn: to whitelist before select', async ()=>{
        let tx = await smg.delegateIn(g.leader,{value:100});
        expectEvent(tx, "delegateInEvent");       
    })
    it('delegateIn to unselected node after select', async ()=>{
        await toSelect(smg, groupId);
        let ginfo1 = await smg.getStoremanGroupInfo(groupId)
        let tx = await smg.delegateIn(wk2.addr,{value:100});
        expectEvent(tx, "delegateInEvent");   
        let ginfo2 = await smg.getStoremanGroupInfo(groupId)
        assert.equal(ginfo1.deposit, ginfo2.deposit)
        //assert.equal(ginfo1.deposit.mul(15000).div(10000), ginfo1.depositWeight)
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
        addr = await smg.getSmDelegatorAddr(wk.addr, 1)
        assert.equal(addr.toLowerCase(), d1.addr)
        addr = await smg.getSmDelegatorAddr(wk.addr, 2)
        assert.equal(addr.toLowerCase(), d2.addr)
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
        addr = await smg.getSmDelegatorAddr(wk.addr, 1)
        assert.equal(addr.toLowerCase(), d1.addr)
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

        // 4, 2 -> 2
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d4, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 1)
        addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d2.addr)

        // 2 --> null
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d2, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.delegatorCount, 0)
        // addr = await smg.getSmDelegatorAddr(wk.addr, 0)
        // assert.equal(addr.toLowerCase(), d2.addr)


        let smInfo2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo.delegatorCount, 5)
        assert.equal(smInfo.delegateDeposit, 5*10000)
        assert.equal(smInfo2.delegatorCount, 0)
    })
    
})

contract('StoremanGroupDelegate reuse', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    const base=40000
    const count=1



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
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await toDelegateIn(smg, wk.addr,index=base,count, value=10000)
        await toPartIn(smg, wk2.addr,index=base,count, value=10000)
    })  

    it('check incentive ', async ()=>{
        let sdata, tx;
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.failed, {from:g.admin})
        let d0 = utils.getAddressFromInt(base+0)

        let groupId2 = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        tx = smg.stakeIn(groupId2, wk.pk, wk.pk,{value:100000});
        await expectRevert(tx, "Candidate has existed")

        tx = smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});
        await expectRevert(tx, "Candidate has existed")   

        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        await sendTransaction(d0, 0, sdata,smg.contract._address);
        sdata =  smg.contract.methods.partClaim(wk2.addr).encodeABI()
        await sendTransaction(d0, 0, sdata,smg.contract._address);
        await smg.stakeClaim(wk.addr);
        await smg.stakeClaim(wk2.addr);

        tx = await smg.stakeIn(groupId2, wk.pk, wk.pk,{value:100000});
        expectEvent(tx, "stakeInEvent")

        tx = await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});
        expectEvent(tx, "stakeInEvent")   
        
    })
    
})

contract('StoremanGroupDelegate delegateClaim check', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    const base=40000
    const count=50



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
        assert.equal(smInfo.delegatorCount, count)
    })  

    it('check incentive ', async ()=>{
        let sdata, addr;
        let smInfo1;
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.failed, {from:g.admin})

        let d = []
        for(let i=0; i<count;i++){
            d[i] = utils.getAddressFromInt(base+i)
        }
        let findFrom = function(d, addr){
            for(let k=0; k<d.length; k++){
                if(d[k].addr == addr){
                    return d[k]
                }
            }
        }
        // delete n
        sdata =  smg.contract.methods.delegateClaim(wk.addr).encodeABI()
        let position = 0;
        for(let i=0; i<count-position-1; i++){
            let delAddr = await smg.getSmDelegatorAddr(wk.addr, position) 
            await sendTransaction(findFrom(d, delAddr.toLowerCase()), 0, sdata,smg.contract._address);
            let newAddr = await smg.getSmDelegatorAddr(wk.addr, position) 
            assert.equal(newAddr.toLowerCase(), d[count-1-i].addr)
            smInfo1 = await smg.getStoremanInfo(wk.addr);
            assert.equal(smInfo1.delegatorCount, count-1-i)
        }
    })
    
})