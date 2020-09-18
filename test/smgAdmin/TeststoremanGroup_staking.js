
const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, setupNetwork, g} = require('../base.js');
const  assert  = require("assert");

contract('StoremanGroupDelegate staking', async () => {

    let  smg
    let groupId, groupId2
    let tester;
    let wk1 = utils.getAddressFromInt(10000)
    let wk3 = utils.getAddressFromInt(10003)
    let wk4 = utils.getAddressFromInt(10004)
    let stakingValue = 50000

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        tester = g.sfs[7];
        console.log("g.sfs:", g.sfs)
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })







    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:stakingValue, from:tester});

        let candidate  = await smg.getStoremanInfo(wk1.addr)
        console.log("candidate:", candidate)
        console.log("candidate.sender, tester:", candidate.sender, tester)

        assert.equal(candidate.sender.toLowerCase(), tester.toLowerCase(),"staking")
        assert.equal(candidate.wkAddr.toLowerCase(), wk1.addr.toLowerCase(),"staking")
        assert.equal(candidate.deposit, stakingValue,"staking")
    })
    it('test stakeIn2', async()=>{
        let stakingValue = 60000;
        let wk = utils.getAddressFromInt(10001)
        let tx =  await smg.stakeIn(groupId, wk.pk, wk.pk, {value:stakingValue, from:tester})
        
        console.log("txhash stakeIn:", tx.tx)
        let candidate  = await smg.getStoremanInfo(wk.addr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester.toLowerCase())
        assert.equal(candidate.wkAddr.toLowerCase(), wk.addr.toLowerCase())
        assert.equal(candidate.deposit, stakingValue)
    })
    it('test stakeAppend', async()=>{
        let candidateOld  = await smg.getStoremanInfo(wk1.addr)

        const appendValue = 3000
        let tx = await smg.stakeAppend(wk1.addr,{from:tester, value:appendValue})

        let candidate  = await smg.getStoremanInfo(wk1.addr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester.toLowerCase())
        assert.equal(candidate.wkAddr.toLowerCase(), wk1.addr)
        assert.equal(candidate.deposit, Number(candidateOld.deposit)+Number(appendValue))
    })

    it('stakeOut ', async ()=>{
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready,{from:g.admin});
        groupId2 = await registerStart(smg,0,{preGroupId: groupId});
        let f = await smg.checkCanStakeOut(wk1.addr)
        console.log("stakeOut1 f:", f)
        assert.equal(f, false, "registering group cannot stakeOut")

        await smg.stakeIn(groupId2, wk3.pk, wk3.pk, {value:stakingValue*2, from:tester})
        await smg.stakeIn(groupId2, wk4.pk, wk4.pk, {value:stakingValue, from:tester})
        let selectedNode = await smg.getSelectedStoreman(groupId2);
        console.log("group2 selected node:",selectedNode );
        console.log("wk3.addr:", wk3.addr);

        await smg.updateGroupStatus(groupId2, g.storemanGroupStatus.ready,{from:g.admin});
        f = await smg.checkCanStakeOut(wk1.addr)
        console.log("stakeOut3 f:", f)
        assert.equal(f, true, "ready group can stakeOut")

        tx = await smg.stakeOut(wk1.addr,{from:tester} )
        expectEvent(tx, 'stakeOutEvent', {wkAddr: web3.utils.toChecksumAddress(wk1.addr), from:web3.utils.toChecksumAddress(tester)})
    })
    it('[StoremanGroupDelegate_stakeClaim] should fail: not dismissed', async () => {
        let f = await smg.checkCanStakeClaim(wk1.addr, {from: tester})
        assert.equal(f, false, 'not dismissed group cannot claim')
        let tx = smg.stakeClaim(wk1.addr, {from: tester})
        await expectRevert(tx, "Cannot claim")
    })

    it('checkCanStakeClaim, not exist sk', async () => {
        let f = await smg.checkCanStakeClaim(tester, {from: tester})
        console.log("checkCanStakeClaim:", f)
        assert.equal(f, false,"none exist node, should return false");
    })
    
    it('checkCanStakeClaim, normal', async () => {
        let f = await smg.checkCanStakeClaim(wk3.addr, {from: tester})
        console.log("checkCanStakeClaim 2 :", f)
        assert.equal(f, false,"working node, should return false");

        f = await smg.checkCanStakeClaim(wk4.addr, {from: tester})
        console.log("checkCanStakeClaim 4 :", f)
        assert.equal(f, true,"not selected node, should return true");


        tx = await smg.stakeClaim(wk4.addr, {from:tester})
        console.log("xxx:", tx.logs[0])
        expectEvent(tx, 'stakeClaimEvent', {wkAddr: web3.utils.toChecksumAddress(wk4.addr), from:web3.utils.toChecksumAddress(tester),
            groupId: groupId2, value:new BN(stakingValue)})
    })

})
