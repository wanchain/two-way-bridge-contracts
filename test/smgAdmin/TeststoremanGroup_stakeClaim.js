const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const Web3 = require('web3')
const { registerStart,stakeInPre, setupNetwork, g} = require('../base.js')


let web3 = new Web3()

contract('StoremanGroupDelegate stakeClaim', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10001)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);

    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('T1 checkCanStakeClaim', async ()=>{ // stakeAppend 10000
        let f = await smg.checkCanStakeClaim(wk.addr);
        assert.equal(f, false,"checkCanStakeClaim")
        console.log("f:",f);
    })
    it('T1 stakeClaim', async ()=>{ // stakeAppend 10000
        let tx =  smg.stakeClaim(wk.addr);
        await expectRevert(tx, "Cannot claim")
    })

    it('T1 stakeIncentiveClaim', async ()=>{ // stakeAppend 10000
        let f = await smg.stakeIncentiveClaim(wk.addr);
        console.log("f:",f);
    })
    it.skip('T1 getStoremanIncentive', async ()=>{ // stakeAppend 10000
        let f = await smg.getStoremanIncentive(wk.addr, Number(groupInfo.startTime));
        console.log("f:",f);
    })


})
