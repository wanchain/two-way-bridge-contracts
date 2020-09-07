const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent , BN} = require('@openzeppelin/test-helpers');



const { registerStart,stakeInPre, setupNetwork, g,timeSet,timeSetSelect } = require('../base.js');



contract('TestSmg', async () => {

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

    it('T3 partIn', async ()=>{
        for(let i=1; i<5; i++){
            await smg.partIn(wk.addr,{value:partValue, from: g.sfs[i]});
        }
        let tx =  smg.partIn(wk.addr,{value:partValue,  from: g.sfs[5]});
        await expectRevert(tx, "Too many partners");       
    })


    it('T4 partout when selecting', async ()=>{
        let tx =  smg.partOut(wk.addr);
        await expectRevert(tx, "selecting");       
    })
    it('T5 "Candidate doesnot exist"', async ()=>{
        let tx =  smg.partOut(wk2.addr);
        await expectRevert(tx, "Candidate doesn't exist");       
    })
    it('T6 partout: partner does not exist', async ()=>{
        await smg.updateGroupStatus(groupId,g.storemanGroupStatus.ready,{from:g.admin})
        let tx =  smg.partOut(wk.addr, {from:g.sfs[6]});
        await expectRevert(tx, "not exist");       
    })
    it('T7 normal partOut', async ()=>{
        let sk = await smg.getStoremanInfo(wk.addr);
        await timeSetSelect(groupInfo);
        let tx =  await smg.partOut(wk.addr,{from:g.sfs[0]});
        expectEvent(tx, 'partOutEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:web3.utils.toChecksumAddress(g.sfs[0])})
        let sk2 = await smg.getStoremanInfo(wk.addr);
        assert.equal(sk.partnerCount, sk2.partnerCount)
        assert.equal(sk2.partnerDeposit, 5*partValue)
    })
    it('T8 partClaim', async ()=>{
        await smg.updateGroupStatus(groupId,g.storemanGroupStatus.dismissed,{from:g.admin})
        let tx = await smg.partClaim(wk.addr, {from:g.sfs[4]});
        expectEvent(tx, "partClaimEvent",{wkAddr:wk.addr, from:web3.utils.toChecksumAddress(g.sfs[4]), amount:new BN(partValue)});       
    })
})
