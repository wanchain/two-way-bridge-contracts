const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;



const sk = [{
    addr:"0xaa79ac2e8a9d1831cc542a519f4d81576bdf3b20", pk:"0x1e38477d09aee7bfa3900d42b327ff711f42a5e1f1a8156d17a7621edd3a55455c8280f5af89b5e8f2a2a5216114ba5cf8a454593cb10614479557d2bc2f1588",
},{
    addr:"0x0beba6154f527596b4b8bb45326131a90c5c6140", pk:"0x28b11382ec24a15d5fa7ae77f9e9531ddc0f83a8ab2faab942db77411e17fdcf8160b0fa132933f1afa613eb19e73cef5d869e06ca58ad7787ddc5f7c11c369b",
}]
const { registerStart,stakeInPre, setupNetwork,g,   timeSetSelect,timeSet} = require('../base.js')
const { expectRevert, expectEvent , BN} = require('@openzeppelin/test-helpers');

contract('StoremanGroupDelegate delegate', async () => {
    let  smg
    let groupId
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10001)
    let tester
    let groupInfo

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        tester =  g.sfs[7];
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
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000, from:tester});
        console.log("tx:", tx);
    })
    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:50000, from:tester});
        console.log("tx:", tx);
    })
    it('delegateIn', async ()=>{
        let tx = await smg.delegateIn(wk.addr,{value:120});
        assert.equal(tx.receipt.logs[0].event, 'delegateInEvent')
        console.log("tx:", tx);
    })


    it('test delegateIn', async()=>{
        let payCount=1;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wk.addr, {from:tester, value:delegateValue});
        }
        let candidate  = await smg.getStoremanInfo(wk.addr)
        assert.equal(candidate.delegatorCount, 2)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wk.addr, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit.toNumber(), delegateValue*payCount)
        console.log("nde: ", nde)
       
    })

    it('test delegateIn2', async()=>{
        let payCount=2;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wk2.addr, {from:tester, value:delegateValue});
        }
        let candidate  = await smg.getStoremanInfo(wk2.addr)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wk2.addr, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit.toNumber(), delegateValue*payCount)
        console.log("nde: ", nde)

    })


  
    it('test toSelect', async ()=>{
        await timeSetSelect(groupInfo);
        let tx = await smg.select(groupId,{from: tester})
        console.log("toSelect tx:", tx.tx)
        console.log("group:",await smg.getStoremanGroupInfo(groupId))

        
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("selected count :", count)
        assert.equal(count, g.memberCountDesign, "select failed")
    })
    it('[StoremanGroupDelegate_delegateOut] should success', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateOut(wk.addr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
        let candidate  = await smg.getStoremanInfo(wk.addr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester.toLowerCase())
        assert.equal(candidate.wkAddr.toLowerCase(), wk.addr)
    })
    it('[StoremanGroupDelegate_delegateClaim] should fail:', async () => {
        let tx = smg.delegateClaim(wk2.addr, {from: tester})
        await expectRevert(tx, 'Cannot claim')

    })
    it.skip('[StoremanGroupDelegate_stakeClaim] should success:', async () => {
        let result = {};
        try {
            await smg.updateGroupStatus(groupId, g.storemanGroupStatus.dismissed, {from:g.admin})
            let txhash = await smg.delegateClaim(wk.addr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
    })

})
