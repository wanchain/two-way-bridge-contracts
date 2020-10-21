const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const fakeQuota = artifacts.require('fakeQuota');
const assert  = require('assert')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitSelect,timeWaitIncentive,toSetGpk } = require('../base.js')

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
        await toSetGpk(smg, groupId);
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



contract('StoremanGroupDelegate_rotate_whiteReuse', async () => {
 
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


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        await stakeInPre(smg, groupId)
        await toSetGpk(smg, groupId)
        groupId2 = await registerStart(smg,0,{preGroupId:groupId});
    })

    it('T5 select2, set whitelist nextGroupId', async ()=>{
        await toSelect(smg, groupId2);
        let sk = await smg.getStoremanInfo(g.leader);
        assert.equal(sk.groupId,groupId)
        assert.equal(sk.nextGroupId, utils.stringTobytes32(""))
    })
})




contract('StoremanGroupDelegate_rotate sm check', async () => {
 
    let  smg, quota
    let groupId1
    let groupId2
    let wk1 = utils.getAddressFromInt(17001)
    let wk2 = utils.getAddressFromInt(17002)
    let groupInfo,groupInfo2;
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        quota = await fakeQuota.deployed();
        await setupNetwork();
    })


    it('T1 registerStart', async ()=>{
        groupId1 = await registerStart(smg, 0, {htlcDuration:90});
        groupId2 = await registerStart(smg, 0, {htlcDuration:90});

        groupInfo = await smg.getStoremanGroupInfo(groupId1);
        groupInfo2 = await smg.getStoremanGroupInfo(groupId2);
        console.log("rotate groupId: ", groupId1)
    })

    it('stakeInPre ', async ()=>{
        await smg.stakeIn(groupId1, wk1.pk, wk1.pk,{value:100000});
        await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});
    })

    it('T1 registerStart, whitelist node exist', async ()=>{
        await smg.updateGroupStatus(groupId1, g.storemanGroupStatus.ready,{from:g.admin})
        await smg.stakeOut(wk1.addr, {from:g.owner})
        let now = parseInt(Date.now()/1000);
        let ws = []
        let srs= []
        for(let i = 0; i < g.whiteCountAll; ++i){
            ws.push(g.wks[i])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let option = {}
        ws[0] = wk1.addr;
        const wanChainId = 2153201998;
        const ethChainId = 2147483708;
        const curve1 = 0, curve2 = 1;
        const minStakeIn = 50000;
        const minDelegateIn = 100;
        const minPartIn = 10000;
        const delegateFee = 1200;
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(Date.now().toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "Invalid node")
    })


    it('T1 registerStart, whitelist not in preGroup', async ()=>{
        await smg.updateGroupStatus(groupId2, g.storemanGroupStatus.ready,{from:g.admin})
        let now = parseInt(Date.now()/1000);
        let ws = []
        let srs= []
        for(let i = 0; i < g.whiteCountAll; ++i){
            ws.push(g.wks[i])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let option = {}
        ws[0] = wk2.addr;
        const wanChainId = 2153201998;
        const ethChainId = 2147483708;
        const curve1 = 0, curve2 = 1;
        const minStakeIn = 50000;
        const minDelegateIn = 100;
        const minPartIn = 10000;
        const delegateFee = 1200;
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(Date.now().toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: groupId1,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        groupInfo2 = await smg.getStoremanGroupInfo(groupId2);
        console.log("groupInfo2:", groupInfo2)
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "Invalid whitelist")
    })

})
