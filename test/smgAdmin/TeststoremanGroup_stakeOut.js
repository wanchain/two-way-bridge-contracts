const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")

const Web3 = require('web3')
const { registerStart,stakeInPre, setupNetwork, g,deploySmg, expectRevert, expectEvent} = require('../base.js')


let web3 = new Web3()

contract('StoremanGroupDelegate stakeOut', async () => {

    let  smg
    let groupId

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{ 
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('T1', async ()=>{ // stakeAppend 10000
        let wk = utils.getAddressFromInt(10001)
        let f = await smg.checkCanStakeOut(wk.addr);
        assert.equal(f, false,"cann't stakeout before selecting")
        console.log("f:",f);
    })
    it('T2', async ()=>{ // stakeAppend 10000
        let wk = utils.getAddressFromInt(10001)
        let sk = await smg.getStoremanInfo(wk.addr);
        //console.log("sk:", sk);
        let tx = smg.connect(g.signerLeader).stakeOut(wk.addr);
        await expectRevert(tx, "Only the sender can stakeOut")
    })
    it('T3', async ()=>{ // stakeAppend 10000
        let wk = utils.getAddressFromInt(10001)
        let tx = smg.stakeOut(wk.addr);
        await expectRevert(tx, "selecting")
    })
})
