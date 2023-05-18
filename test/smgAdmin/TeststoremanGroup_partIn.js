const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent , BN} = require('@openzeppelin/test-helpers');



const { registerStart,stakeInPre, setupNetwork, g,toSelect,timeWaitIncentive,toPartIn,sendTransaction } = require('../base.js');



contract('StoremanGroupDelegate partIn', async () => {

    let  smg
    let groupId,groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let partValue = 10000;

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("groupInfo:", groupInfo);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })

    it('T1 staker doesnot exist', async ()=>{
        let tx =  smg.partIn(wk2.addr,{value:partValue});
        await expectRevert(tx, "Candidate doesn't exist");       
    })

    it('T2 partIn', async ()=>{
        let smallValue = 1000;
        let sk = await smg.getStoremanInfo(wk.addr);
        let tx =  smg.partIn(wk.addr,{value:smallValue, from:g.sfs[0]});
        await expectRevert(tx, "Too small value")
    })

    it('T2 partIn', async ()=>{
        let sk = await smg.getStoremanInfo(wk.addr);
        let tx = await smg.partIn(wk.addr,{value:partValue, from:g.sfs[0]});
        expectEvent(tx, 'partInEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[0]), value:new BN(partValue)})
        let sk2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(sk.partnerCount, 0)
        assert.equal(sk.partnerDeposit, 0)
        assert.equal(sk2.partnerCount, 1)
        assert.equal(sk2.partnerDeposit, partValue)
        console.log("tx:", tx);
    })
    it('T2 partIn again', async ()=>{
        let sk = await smg.getStoremanInfo(wk.addr);
        let tx = await smg.partIn(wk.addr,{value:partValue, from:g.sfs[0]});
        expectEvent(tx, 'partInEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[0]), value:new BN(partValue)})
        let sk2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(sk.partnerCount, 1)
        assert.equal(sk.partnerDeposit, partValue)
        assert.equal(sk2.partnerCount, 1)
        assert.equal(sk2.partnerDeposit, partValue*2)
        console.log("tx:", tx);
    })

    it('T3 partIn', async ()=>{
        for(let i=1; i<5; i++){
            await smg.partIn(wk.addr,{value:partValue, from: g.sfs[i]});
        }
        let tx =  smg.partIn(wk.addr,{value:partValue,  from: g.sfs[5]});
        await expectRevert(tx, "Too many partners");       
    })
    it('T8 partClaim', async ()=>{
        let tx = smg.partClaim(wk.addr, {from:g.sfs[4]});
        await expectRevert(tx, "Cannot claim");       
    })

    it('T4 partout when selecting', async ()=>{
        let tx =  smg.partOut(wk.addr);
        await expectRevert(tx, "selecting");       
    })
    it('T5 "Candidate doesnot exist"', async ()=>{
        let tx =  smg.partOut(wk2.addr);
        await expectRevert(tx, "Candidate doesn't exist");       
    })


    it('T7 normal partOut', async ()=>{
        await toSelect(smg, groupId);
        let sk = await smg.getStoremanInfo(wk.addr);
        let tx =  await smg.partOut(wk.addr,{from:g.sfs[0]});
        expectEvent(tx, 'partOutEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[0])})
        tx = smg.partIn(wk.addr,{from:g.sfs[0], value:10000});
        await expectRevert(tx, "Quited")

        let sk2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(sk.partnerCount, sk2.partnerCount)
        assert.equal(sk2.partnerDeposit, 4*partValue)
  

    })
    it('T6 partout: partner does not exist', async ()=>{
        let tx =  smg.partOut(wk.addr, {from:g.sfs[6]});
        await expectRevert(tx, "Partner doesn't exist");       
    })
    it('T8 partClaim', async ()=>{

        await timeWaitIncentive(smg, groupId, wk.addr);

        await smg.storemanGroupDismiss(groupId, {from:g.leader})

        tx = smg.partClaim(wk.addr, {from:g.sfs[8]});
        await expectRevert(tx, "not exist")

        let skInfo1 = await smg.getStoremanInfo(wk.addr);

        tx = await smg.partClaim(wk.addr, {from:g.sfs[4]});
        console.log("xxxxxxxxxxxxxxxxxxx:", tx)
        expectEvent(tx, "partClaimEvent",{wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[4]), amount:new BN(partValue)});       
        let skInfo2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(skInfo1.partnerCount, parseInt(skInfo2.partnerCount)+1,"partCLaim failed")
    })
})




contract('StoremanGroupDelegate partClaim', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let de1 = utils.getAddressFromInt(30000)
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
        await toPartIn(smg, wk.addr,index=base,count, value=10000)
        let smInfo = await smg.getStoremanInfo(wk.addr);
        console.log("stakeIn smInfo:", smInfo)
        assert.equal(smInfo.partnerCount, 5)
    })  

    it('check incentive ', async ()=>{
        let d, sdata, addr;
        let smInfo1;
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.failed, {from:g.admin})


        let smInfo = await smg.getStoremanInfo(wk.addr);

        d0 = utils.getAddressFromInt(base+0)
        d1 = utils.getAddressFromInt(base+1)
        d2 = utils.getAddressFromInt(base+2)
        d3 = utils.getAddressFromInt(base+3)
        d4 = utils.getAddressFromInt(base+4)

        // delete the first one,   0,1,2,3,4  -->  4,1,2,3
        sdata =  smg.contract.methods.partClaim(wk.addr).encodeABI()
        await sendTransaction(d0, 0, sdata,smg.contract._address);
        addr = await smg.getSmPartnerAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmPartnerAddr(wk.addr, 3)
        assert.equal(addr.toLowerCase(), d3.addr)
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.partnerCount, 4)

        // delete the last one 4,1,2,3  --->  4, 1, 2
        sdata =  smg.contract.methods.partClaim(wk.addr).encodeABI()
        await sendTransaction(d3, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.partnerCount, 3)

        addr = await smg.getSmPartnerAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmPartnerAddr(wk.addr, 2)
        assert.equal(addr.toLowerCase(), d2.addr)

        // delete the middle one 4, 1, 2  --> 4, 2
        sdata =  smg.contract.methods.partClaim(wk.addr).encodeABI()
        await sendTransaction(d1, 0, sdata,smg.contract._address);
        smInfo1 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo1.partnerCount, 2)
        addr = await smg.getSmPartnerAddr(wk.addr, 0)
        assert.equal(addr.toLowerCase(), d4.addr)
        addr = await smg.getSmPartnerAddr(wk.addr, 1)
        assert.equal(addr.toLowerCase(), d2.addr)

        let smInfo2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(smInfo.partnerCount, 5)
        assert.equal(smInfo.partnerDeposit, 5*10000)
        assert.equal(smInfo2.partnerCount, 2)
        //assert.equal(smInfo2.partnerDeposit, 2*10000)
    })
    
})

