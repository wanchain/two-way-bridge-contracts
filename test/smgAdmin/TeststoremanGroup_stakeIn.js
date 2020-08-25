const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { registerStart,stakeInPre, setupNetwork} = require('../basee.js');
const { assert } = require("chai");

contract('TestSmg', async () => {

    let  smg
    let groupId

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('T1', async ()=>{ // stakeIn 50000
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('T2', async ()=>{ // stakeIn 49999
        let wk = utils.getAddressFromInt(10002)
        let tx = smg.stakeIn(groupId, wk.pk, wk.pk,{value:49999});

        await expectRevert(tx, "Too small value in stake");
    })
    it('T3', async ()=>{
        let wk = utils.getAddressFromInt(10001)
        let tx = smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});

        await expectRevert(tx, "Candidate has existed");       
    })

    it('T4', async ()=>{ 
        let wk = utils.getAddressFromInt(10004)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:60000});
        let sk = await smg.getSelectedSmInfo(groupId, 1);
        console.log("tx:", tx);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr.toLowerCase(), "stakein 60000 failed");
    })
    it('T5', async ()=>{ 
        let wk = utils.getAddressFromInt(10005)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:55000});
        let sk = await smg.getSelectedSmInfo(groupId, 2);
        console.log("tx:", tx);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr.toLowerCase(), "stakein 55000 failed");
    })
    it('T6', async ()=>{ 
        let wk = utils.getAddressFromInt(10006)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:57000});
        let sk = await smg.getSelectedSmInfo(groupId, 2);
        console.log("tx:", tx);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr.toLowerCase(), "stakein 57000 failed");
    })
    it('T7', async ()=>{ 
        let wk = utils.getAddressFromInt(10007)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:56000});
        let sk = await smg.getSelectedSmInfo(groupId, 3);
        console.log("tx:", tx);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr.toLowerCase(), "stakein 56000 failed");
    })
})