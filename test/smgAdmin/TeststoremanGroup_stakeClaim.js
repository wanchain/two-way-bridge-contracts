const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, setupNetwork,toStakeIn,timeWaitIncentive, g} = require('../base.js')


contract('StoremanGroupDelegate stakeClaim', async () => {

    let  smg
    let groupId, groupInfo, stakeInTime
    let wk = utils.getAddressFromInt(10001)
    let tester;
    let stakingValue = 100000
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        tester  = g.sfs[8]
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg, 0, { htlcDuration:30});
        groupInfo = await smg.getStoremanGroupInfo(groupId);

    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{ 
        stakeInTime = await toStakeIn(smg, groupId, wk, value=stakingValue, from=tester)
    })
    it('T1 stakeIncentiveClaim', async ()=>{
        let wkn = utils.getAddressFromInt(11001)
        let tx =  smg.stakeIncentiveClaim(wkn.addr,{from:tester});
        await expectRevert(tx, "Candidate doesn't exist")

        tx = await smg.stakeIncentiveClaim(wk.addr,{from:tester});
        expectEvent(tx, 'stakeIncentiveClaimEvent', {amount:new BN(0)})
    })

    it('T1 checkCanStakeClaim', async ()=>{ 
        let f = await smg.checkCanStakeClaim(wk.addr);
        assert.equal(f, false,"checkCanStakeClaim")
    })


    it('T1 stakeClaim', async ()=>{ 
        let tx =  smg.stakeClaim(wk.addr);
        await expectRevert(tx, "Cannot claim")
    })
    it('T1 getStoremanIncentive', async ()=>{ 
        let f = await smg.getStoremanIncentive(wk.addr, parseInt(groupInfo.startTime/g.timeBase));
        console.log("f:",f);
    })
    it('T11 stakeClaim', async ()=>{

        await timeWaitIncentive(smg, groupId, wk.addr);

        let tx

        console.log("groupId:", groupId)
        groupInfo = await smg.getStoremanGroupInfo(groupId)

        tx = await smg.stakeIncentiveClaim(wk.addr,{from:tester});
        console.log("#####################################################################################################stakeIncentiveClaim event:", tx.logs[0].args)
        expectEvent(tx, 'stakeIncentiveClaimEvent')

        tx = await smg.stakeIncentiveClaim(wk.addr,{from:tester});
        expectEvent(tx, 'stakeIncentiveClaimEvent', {amount:new BN(0)})

        await smg.storemanGroupDismiss(groupId,{from:g.leader})
        tx = await smg.stakeClaim(wk.addr);
        expectEvent(tx, 'stakeClaimEvent', {wkAddr: g.web3.utils.toChecksumAddress(wk.addr), from:g.web3.utils.toChecksumAddress(tester),
            groupId: groupId, value:new BN(stakingValue)})

        // claim again.
        tx = smg.stakeClaim(wk.addr);
        await expectRevert(tx, "Claimed")

        tx = smg.stakeAppend(wk.addr,{value:10, from:tester});
        await expectRevert(tx, "Claimed")


    })



})
