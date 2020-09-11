const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const fakeQuota = artifacts.require('fakeQuota');
const assert  = require('assert')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitSelect,timeWaitIncentive } = require('../base.js')

contract('StoremanGroupDelegate_rotate', async () => {
 
    let  smg, quota
    let groupId
    let groupId2
    let groupInfo,groupInfo2;
    let wk = utils.getAddressFromInt(10001)
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        quota = await fakeQuota.deployed();
        await setupNetwork();
    })


    it('T1 registerStart', async ()=>{
        groupId = await registerStart(smg, 0, {htlcDuration: 90});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("rotate groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('T4', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 1);
        console.log("sk:=======", sk)
        //assert.equal(sk.pkAddress.toLowerCase(), wk.addr, "the node should be second one")
    })

    it('T2 test select', async ()=>{
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("slected sm number: %d", count);  
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("storeman %d info: %s, %s, %s", i, sk.pkAddress, sk.groupId, sk.nextGroupId);
        } 
    })
    it('T3 registerStart2', async ()=>{
        await utils.sleep(1000)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.leader});
        groupId2 = await registerStart(smg, 0, {preGroupId:groupId});
        console.log("groupId2: ", groupId2)
        groupInfo2 = await smg.getStoremanGroupInfo(groupId2);
        let sk = await smg.getSelectedSmInfo(groupId2, 1);
        console.log("registerStart2, 1:", sk)
    })
    it('T4', async ()=>{ 
        let wk2 = utils.getAddressFromInt(20001)
        let tx = await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId2, 1);
        console.log("sk:=======", sk)
        //assert.equal(sk.pkAddress.toLowerCase(), wk.addr, "the node should be second one")
    })



    it('T5 select2', async ()=>{
        await timeWaitSelect(groupInfo2)
        await toSelect(smg, groupId2);
        let count = await smg.getSelectedSmNumber(groupId2)
        console.log("slected sm number: %d", count);  
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId2, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("storeman %d info: %s, %s, %s", i, sk.pkAddress, sk.groupId, sk.nextGroupId);
        } 
    })
    it('T6 dismiss', async ()=>{

        await timeWaitIncentive(smg, groupId, wk.addr);


        let f, tx;
        let groupLeader = await smg.getSelectedSmInfo(groupId, 0);
        console.log("groupLeader:", groupLeader)
        
        await quota.setDebtClean(false)
        f = await smg.checkGroupDismissable(groupId)
        console.log("f:", f)
        assert.equal(f, false,"checkGroupDismissable")

        tx = smg.storemanGroupDismiss(groupId,{from:g.leader})
        await expectRevert(tx, 'can not dismiss')

        await quota.setDebtClean(true)
        await smg.storemanGroupDismiss(groupId,{from:g.leader})
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("slected sm number: %d", count);  
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("storeman %d info: %s, %s, %s", i, sk.pkAddress, sk.groupId, sk.nextGroupId);
        }  

    }) 

    it('T5 old group failed', async ()=>{
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.failed, {from:g.admin})
        groupId2 = await registerStart(smg, 0, {preGroupId:groupId});
        groupinfo2 = await smg.getStoremanGroupInfo(groupId2)
        console.log("groupinfo2:", groupinfo2)
    })



})
