const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const Web3 = require('web3')
const { registerStart,stakeInPre, setupNetwork, g, timeWaitSelect, toSelect} = require('../base.js')


let web3 = new Web3()

contract('StoremanGroupDelegate stakeAppend', async () => {

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
        groupInfo = await smg.getStoremanGroupInfo(groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('T1', async ()=>{ // stakeAppend 10000
        let tx = await smg.stakeAppend(wk.addr,{value:10000});
        console.log("tx:", tx);
        expectEvent(tx, 'stakeAppendEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:g.owner,value:new BN(10000)})
        let ski = await smg.getSelectedSmInfo(groupId, 1);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        assert.equal(sk.deposit.toString(10), "60000", "deposit is wrong" )
    })
    it('T21', async ()=>{ // stakeAppend 10
        let tx = await smg.stakeAppend(wk.addr,{value:10});
        console.log("tx:", tx);
        let ski = await smg.getSelectedSmInfo(groupId, 1);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        console.log("sk.deposit:", sk.deposit.toString(10))
        assert.equal(sk.deposit.toString(10), "60010", "deposit is wrong" )
    })

    it('stakeIn', async ()=>{ 
        let wk2 = utils.getAddressFromInt(10002)
        let tx = await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:70000});
        console.log("tx:", tx);
    })

    it('T12', async ()=>{ // stakeAppend 10000
        let tx = await smg.stakeAppend(wk.addr,{value:10000});
        console.log("tx:", tx);
        expectEvent(tx, 'stakeAppendEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:g.owner,value:new BN(10000)})
        let ski = await smg.getSelectedSmInfo(groupId, 1);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        assert.equal(sk.deposit.toString(10), "70010", "deposit is wrong" )
    })


    it('T23 Candidate doesnot exist', async ()=>{ // stakeAppend 10
        let wkn = utils.getAddressFromInt(10009)
        let tx =  smg.stakeAppend(wkn.addr,{value:10});
        await expectRevert(tx, "Candidate doesn't exist")

    })

    it('T24', async ()=>{ // stakeAppend 10
        let tx =  smg.stakeAppend(wk.addr,{value:10, from:g.sfs[7]});
        await expectRevert(tx, "Only the sender can stakeAppend")

    })
    it('whitelist append', async ()=>{
            let tx =  await smg.stakeAppend(g.wks[1],{value:10, from:g.sfs[1]});
            expectEvent(tx, "stakeAppendEvent")
    })
    it('after ready append', async ()=>{
        await timeWaitSelect(groupInfo);
        await toSelect(smg, groupId);
        let wk = utils.getAddressFromInt(10001)
        let tx =  await smg.stakeAppend(wk.addr,{value:10});
        expectEvent(tx, "stakeAppendEvent")
    })

})
