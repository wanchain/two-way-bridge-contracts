const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")

const { registerStart,stakeInPre, deploySmg,setupNetwork,toStakeIn,timeWaitIncentive, g,expectRevert, expectEvent} = require('../base.js')


contract('StoremanGroupDelegate stakeClaim', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10001)
    let tester;
    let stakingValue = 100000
    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        tester  = g.signers[9] //g.sfs[8]
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg, 0, { htlcDuration:30});
        groupInfo = await smg.getStoremanGroupInfo(groupId);

    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{ 
        await toStakeIn(smg, groupId, wk, value=stakingValue, from=tester)
    })
    it('T1 stakeIncentiveClaim', async ()=>{
        let wkn = utils.getAddressFromInt(11001)
        let tx =  smg.connect(tester).stakeIncentiveClaim(wkn.addr);
        await expectRevert(tx, "Candidate doesn't exist")

        tx = await smg.connect(tester).stakeIncentiveClaim(wk.addr);
        await expectEvent(g.storemanLib, tx, 'stakeIncentiveClaimEvent', [null, null, 0])
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

        tx = await smg.connect(tester).stakeIncentiveClaim(wk.addr);
        // console.log("stakeIncentiveClaim event:", tx.logs[0].args)
        await expectEvent(g.storemanLib, tx, 'stakeIncentiveClaimEvent')

        tx = await smg.connect(tester).stakeIncentiveClaim(wk.addr);
        //expectEvent(tx, 'stakeIncentiveClaimEvent', {amount:new BN(0)})

        await smg.connect(g.signerLeader).storemanGroupDismiss(groupId)
        tx = await smg.stakeClaim(wk.addr);
        await expectEvent(g.storemanLib, tx, 'stakeClaimEvent', [wk.addr, tester.address, groupId, stakingValue])

        // claim again.
        tx = smg.stakeClaim(wk.addr);
        await expectRevert(tx, "Claimed")

        tx = smg.connect(tester).stakeAppend(wk.addr,{value:10});
        await expectRevert(tx, "Claimed")


    })



})
