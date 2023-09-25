const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;



const sk = [{
    addr:"0xaa79ac2e8a9d1831cc542a519f4d81576bdf3b20", pk:"0x1e38477d09aee7bfa3900d42b327ff711f42a5e1f1a8156d17a7621edd3a55455c8280f5af89b5e8f2a2a5216114ba5cf8a454593cb10614479557d2bc2f1588",
},{
    addr:"0x0beba6154f527596b4b8bb45326131a90c5c6140", pk:"0x28b11382ec24a15d5fa7ae77f9e9531ddc0f83a8ab2faab942db77411e17fdcf8160b0fa132933f1afa613eb19e73cef5d869e06ca58ad7787ddc5f7c11c369b",
}]
const { registerStart,stakeInPre, setupNetwork,g,   timeWaitSelect,deploySmg, timeWaitIncentive} = require('../base.js')
const { expectRevert, expectEvent , BN} = require('@openzeppelin/test-helpers');

contract('StoremanGroupDelegate delegate', async () => {
    let  smg
    let groupId
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10001)
    let tester
    let groupInfo

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        tester = g.signers[8]  //g.sfs[7];
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
        groupInfo = await smg.getStoremanGroupInfo(groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    
    it('stakeIn', async ()=>{
        let tx = await smg.connect(tester).stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('stakeIn', async ()=>{
        let tx =  smg.delegateIn(wk2.addr,{value:120});
        await expectRevert(tx, "Candidate doesn't exist")

        tx = await smg.connect(tester).stakeIn(groupId, wk2.pk, wk2.pk,{value:50000});
        console.log("tx:", tx);

        tx =  smg.delegateIn(wk2.addr,{value:1200000});
        await expectRevert(tx, "Too many delegation")
    })
    it('delegateIn', async ()=>{
        let tx = await smg.delegateIn(wk.addr,{value:120});
        let receipt = await tx.wait()
        // assert.equal(receipt.logs[0].event, 'delegateInEvent')
        // console.log("tx:", tx);
    })


    it('test delegateIn', async()=>{
        let payCount=1;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.connect(tester).delegateIn(wk.addr, {value:delegateValue});
        }
        let candidate  = await smg.getStoremanInfo(wk.addr)
        assert.equal(candidate.delegatorCount, 2)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wk.addr, tester.address);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit.toNumber(), delegateValue*payCount)
        console.log("nde: ", nde)
       
        tx =  smg.connect(tester).delegateOut(wk.addr)
        await expectRevert(tx, "selecting")

    })

    it('test delegateIn2', async()=>{
        let payCount=2;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.connect(tester).delegateIn(wk2.addr, {value:delegateValue});
        }
        let candidate  = await smg.getStoremanInfo(wk2.addr)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wk2.addr, tester.address);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit.toNumber(), delegateValue*payCount)
        console.log("nde: ", nde)
    })


  
    it('test toSelect', async ()=>{
        await timeWaitSelect(groupInfo);
        let tx = await smg.connect(tester).select(groupId)
        console.log("toSelect tx:", tx.tx)
        console.log("group:",await smg.getStoremanGroupInfo(groupId))

        
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("selected count :", count)
        assert.equal(count, g.memberCountDesign, "select failed")
    })
    it('[StoremanGroupDelegate_delegateOut] should success', async () => {
        let result = {};
        try {
            let txhash = await smg.connect(tester).delegateOut(wk.addr)
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
        let tx = smg.connect(tester).delegateIn(wk.addr, {value:100})
        await expectRevert(tx, "Quited")

        let candidate  = await smg.getStoremanInfo(wk.addr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester.address.toLowerCase())
        assert.equal(candidate.wkAddr.toLowerCase(), wk.addr)
    })

    it('[StoremanGroupDelegate_delegateOut]', async () => {
        let wkn = utils.getAddressFromInt(110000)

        let tx =  smg.connect(tester).delegateOut(wkn.addr)
        await expectRevert(tx, "Candidate doesn't exist")

        tx =  smg.connect(g.signers[9]).delegateOut(wk.addr)
        await expectRevert(tx, "no deposit")
    })


    it('[StoremanGroupDelegate_delegateClaim] should fail:', async () => {
        let tx = smg.connect(tester).delegateClaim(wk2.addr)
        await expectRevert(tx, 'Cannot claim')

    })
    it('[StoremanGroupDelegate_delegateClaim] should success:', async () => {
        await timeWaitIncentive(smg, groupId, wk.addr);
        let tx
        await smg.connect(g.signerLeader).storemanGroupDismiss(groupId)
        let sa = await smg.getStoremanIncentive(wk.addr, parseInt(groupInfo.startTime/g.timeBase));
        console.log("sk incentive: ", sa)
        let da = await smg.getSmDelegatorInfoIncentive(wk.addr, tester.address, parseInt(groupInfo.startTime/g.timeBase));
        console.log("da incentive: ", da)

        let wkn = utils.getAddressFromInt(11000)
        tx = smg.delegateIncentiveClaim(wkn.addr)
        await expectRevert(tx, "Candidate doesn't exist")

        tx = smg.connect(g.signers[9]).delegateIncentiveClaim(wk.addr)
        await expectRevert(tx, "not exist")

        tx = await smg.connect(tester).delegateIncentiveClaim(wk2.addr)
        // expectEvent(tx, "delegateIncentiveClaimEvent")
        // console.log("delegateIncentiveClaimEvent tx:", tx.logs[0].args)
        tx = await smg.connect(tester).delegateIncentiveClaim(wk2.addr)
        // expectEvent(tx, "delegateIncentiveClaimEvent",{amount:new BN(0)})

        tx = await smg.connect(tester).delegateClaim(wk.addr)
        // expectEvent(tx, "delegateClaimEvent")
        // console.log("delegateClaim :", tx);

        tx = smg.connect(g.signers[9]).delegateClaim(wk.addr)
        await expectRevert(tx,"not exist")

    })

})
