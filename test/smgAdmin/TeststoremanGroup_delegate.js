const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const pu = require('promisefy-util')
const assert = require('chai').assert;



const sk = [{
    addr:"0xaa79ac2e8a9d1831cc542a519f4d81576bdf3b20", pk:"0x1e38477d09aee7bfa3900d42b327ff711f42a5e1f1a8156d17a7621edd3a55455c8280f5af89b5e8f2a2a5216114ba5cf8a454593cb10614479557d2bc2f1588",
},{
    addr:"0x0beba6154f527596b4b8bb45326131a90c5c6140", pk:"0x28b11382ec24a15d5fa7ae77f9e9531ddc0f83a8ab2faab942db77411e17fdcf8160b0fa132933f1afa613eb19e73cef5d869e06ca58ad7787ddc5f7c11c369b",
}]
const { registerStart,stakeInPre, setupNetwork} = require('./base.js')

contract('StoremanGroupDelegate', async () => {
 
    let  smg
    let groupId

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    
    it('test stakeIn', async()=>{
        for(let i=0; i<sk.length; i++){
            let stakingValue = 1 + i*100000000;
            let deFee = 5;
            let tx =  await smg.stakeIn(id, sk[i].pk,sk[i].pk,deFee, {value:stakingValue})
            console.log("txhash stakeIn:", tx.tx)
            await utils.waitReceipt(tx.tx)
            let candidate  = await smg.getStoremanInfo(wAddr)
            console.log("candidate:", candidate)
            assert.equal(candidate.sender.toLowerCase(), tester)
            assert.equal(candidate.pkAddress.toLowerCase(), wAddr)
            assert.equal(candidate.deposit, stakingValue)
        }
    })


    it('test delegateIn', async()=>{
        let payCount=1;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wAddr, {from:tester, value:delegateValue});
            await utils.waitReceipt(tx.tx)
        }
        let candidate  = await smg.getStoremanInfo(wAddr)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wAddr, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit, delegateValue*payCount)
        console.log("nde: ", nde)

        let de2 = await smg.getSmDelegatorAddr(wAddr, 0);
        console.log("de2:", de2);
        
    })

    it('test delegateIn2', async()=>{
        let payCount=2;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wAddr2, {from:tester, value:delegateValue});
            await utils.waitReceipt(tx.tx)
        }
        let candidate  = await smg.getStoremanInfo(wAddr2)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wAddr2, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit, delegateValue*payCount)
        console.log("nde: ", nde)

        let de2 = await smg.getSmDelegatorAddr(wAddr2, 0);
        console.log("de2:", de2);
        
    })

    it('[StoremanGroupDelegate_delegateOut] should fail: selecting', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateOut(wAddr, {from: tester})
            console.log("delegateOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, 'selecting time, can\'t quit');
    })
  
    it('test toSelect', async ()=>{
        await pu.sleep(10000)
        let tx = await smg.toSelect(id,{from: tester})
        console.log("toSelect tx:", tx.tx)
        await utils.waitReceipt(tx.tx)
        console.log("group:",await smg.getStoremanGroupInfo(id))

        
        let count = await smg.getSelectedSmNumber(id)
        console.log("selected count :", count)
        assert.equal(count, memberCountDesign)
    })
    it('[StoremanGroupDelegate_delegateOut] should success', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateOut(wAddr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
        let candidate  = await smg.getStoremanInfo(wAddr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester)
        assert.equal(candidate.pkAddress.toLowerCase(), wAddr)
    })
    it('[StoremanGroupDelegate_delegateClaim] should fail: not dismissed', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateClaim(wAddr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, 'group can\'t claim');
    })
    it('[StoremanGroupDelegate_stakeClaim] should success:', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateClaim(wAddr2, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
    })

})
