const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;

const { registerStart,stakeInPre, g, deploySmg,toSetGpk,toSelect, setupNetwork,timeWaitSelect,expectRevert, expectEvent} = require('../base.js')

contract('StoremanGroupDelegate select', async () => {
 
    let  smg
    let groupId
    let groupInfo;


    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    it('T1', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 1);
        assert.equal(sk.wkAddr, wk1.addr, "the node should be second one")
    })
    it('T2', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:55000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr, wk2.addr, "the node should be third one")
    })
    it('T3', async ()=>{ 
        let wk = utils.getAddressFromInt(10003)
        let tx = await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr, wk3.addr, "the node should be second one")
    })
    it('T7 setInvalidSm', async ()=>{
        let dep = await smg.getDependence();
        await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
        let tx =  smg.connect(g.signerOwner).setInvalidSm(groupId, [2],["0x02"]);
        await expectRevert(tx, "Sender is not allowed");
  
        tx = await smg.connect(g.signerAdmin).setInvalidSm(groupId, [2],[5]);
        console.log(" setInvalidSm tx:", tx)
        await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
    })

    it('test select', async ()=>{
        await timeWaitSelect(groupInfo);
        await toSelect(smg, groupId);
        let count = await smg.getSelectedSmNumber(groupId);
        assert.equal(count, g.memberCountDesign, "selected count is wrong")
        let sn = new Array(count);
        for(let i=0; i<count; i++) {
            sn[i] = await smg.getSelectedSmInfo(groupId, i)
        }
        assert.equal(sn[0].wkAddr,g.leader,"the first one is wrong")
        assert.equal(sn[1].wkAddr,wk1.addr,"the second one is wrong")
        assert.equal(sn[2].wkAddr,wk3.addr,"the third one is wrong")
        assert.equal(sn[3].wkAddr,wk2.addr,"the fourth one is wrong")
    })

    it('T7 setInvalidSm', async ()=>{
        let dep = await smg.getDependence();
        await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
        let tx =  smg.connect(g.signerOwner).setInvalidSm(groupId, [2],["0x02"], {from:g.owner});
        await expectRevert(tx, "Sender is not allowed");
        
        tx =  await smg.connect(g.signerAdmin).setInvalidSm(groupId, [2],[2]);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        //console.log("groupInfo:", groupInfo)
        assert.equal(groupInfo.tickedCount, 1)

        tx = await smg.connect(g.signerAdmin).setInvalidSm(groupId, [2],[5]);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 2)

        tx = await smg.connect(g.signerAdmin).setInvalidSm(groupId, [2],[6]);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 3)
        assert.equal(groupInfo.status, g.storemanGroupStatus.selected)
        
        tx = await smg.connect(g.signerAdmin).setInvalidSm(groupId, [2],[4]);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 3)
        assert.equal(groupInfo.status, g.storemanGroupStatus.failed)
        await smg.connect(g.signerAdmin).recordSmSlash(wk1.addr,{from:g.admin})
        await smg.connect(g.signerAdmin).recordSmSlash(wk1.addr,{from:g.admin})
        await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
    })

    it('checkCanStakeClaim', async ()=>{
        let f = await smg.checkCanStakeClaim(wk1.addr);
        console.log("checkCanStakeClaim:", f)
        assert.equal(f, true,"checkCanStakeClaim")

        let tx = await smg.stakeClaim(wk1.addr);
        await expectEvent(g.storemanLib, tx, 'stakeIncentiveClaimEvent')
        // console.log("tx stakeClaim:", tx.logs[0].args)
    })

})




contract('StoremanGroupDelegate select', async () => {
 
    let  smg
    let groupId
    let groupInfo;


    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId,0,nodeCount=3)
    })
    it('test select', async ()=>{
        let tx =  smg.connect(g.signerLeader).select(utils.stringTobytes32("none"))
        await expectRevert(tx, "Wrong status")
    })
    it('test select', async ()=>{
        await smg.connect(g.signerOwner).setHalt(true)
        let btx =  smg.connect(g.signerLeader).select(groupId)
        await expectRevert(btx, "Smart contract is halted")
        await smg.connect(g.signerOwner).setHalt(false)
        let tx =  smg.connect(g.signerLeader).select(groupId)
        await expectRevert(tx, "Wrong time")
    })
    it('test select', async ()=>{
        await timeWaitSelect(groupInfo);
        let tx = await toSelect(smg, groupId);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        //console.log("groupInfo:", groupInfo)
        assert.equal(groupInfo.status, g.storemanGroupStatus.failed, "select failed when insufficient")
    })




})



contract('StoremanGroupDelegate setInvalidSm groupInfo', async () => {
 
    let  smg
    let groupId
    let groupInfo;


    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    it('T1', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 1);
        assert.equal(sk.wkAddr, wk1.addr, "the node should be second one")
    })
    it('T2', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:55000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr, wk2.addr, "the node should be third one")
    })


    it('test select', async ()=>{
        await timeWaitSelect(groupInfo);
        await toSelect(smg, groupId);
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        let deposit = await smg.getDeposit(groupId)
        assert.equal(deposit.toString(),groupInfo.deposit.toString() )
        let status = await smg.getStoremanGroupStatus(groupId)
        assert.equal(status.status, groupInfo.status)
    })

    it('T7 setInvalidSm', async ()=>{
        let dep = await smg.getDependence();
        await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);

        let smAddr = await smg.getSelectedSmInfo(groupId, 2)
        let sm1 = await smg.getStoremanInfo(smAddr.wkAddr)
        console.log("2 addr: ", smAddr.wkAddr)
        let selectedOld = await smg.getSelectedStoreman(groupId);
        console.log("selected:",selectedOld)
        let groupInfoOld = await smg.getStoremanGroupInfo(groupId);
        tx = await smg.setInvalidSm(groupId, [2],[5], {from:g.admin});
        //console.log(" setInvalidSm tx:", tx)
        let selectedNew = await smg.getSelectedStoreman(groupId);
        console.log("selected new:",selectedNew)
        let smAddr2 = await smg.getSelectedSmInfo(groupId, 2)
        console.log("2 addr: ", smAddr2.wkAddr)
        let sm2 = await smg.getStoremanInfo(smAddr2.wkAddr)
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        //console.log("groupInfo:", groupInfo)
        // the old node has 55000, the new one is backup, has 50000
        assert.equal(parseInt(groupInfoOld.deposit)-55000, parseInt(groupInfo.deposit)-50000, "setInvalidSm group deposit")
        console.log("==============================old sm:", sm1.deposit)
        console.log("==============================new sm:", sm2.deposit)
        
        assert.equal(groupInfo.tickedCount, 1)

    })
})


contract('StoremanGroupDelegate setInvalidSm fetch backup whitelist again', async () => {
 
    let  smg
    let groupId,groupId2
    let dep
    let sk

    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)
    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        dep  = await smg.getDependence();
    })
    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        await stakeInPre(smg, groupId)
        await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:60000});
        await toSelect(smg,groupId);
    })

   

    it('T7 setInvalidSm', async ()=>{
        await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
        tx = await smg.setInvalidSm(groupId, [1],[5], {from:g.admin});
        let selecteds = await smg.getSelectedStoreman(groupId);
        console.log("selected:",selecteds)
        console.log("wk1.addr:", wk1.addr)
        let smAddr2 = await smg.getSelectedSmInfo(groupId, 1)
        sk = await smg.getStoremanInfo(smAddr2.wkAddr)
        //console.log("sk:", sk)
        assert.equal(sk.groupId, groupId)
        assert.equal(sk.nextGroupId, utils.stringTobytes32(""))
        await toSetGpk(smg, groupId)
        await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
    })

    it('T7 setInvalidSm', async ()=>{
        groupId2 = await registerStart(smg,0,{preGroupId:groupId});
        await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:60000});
        await toSelect(smg, groupId2);

        await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
        tx = await smg.setInvalidSm(groupId2, [1],[5], {from:g.admin});
        let smAddr3 = await smg.getSelectedSmInfo(groupId2, 1)
        sk3 = await smg.getStoremanInfo(smAddr3.wkAddr)
        console.log("sk3:", sk3)
        assert.equal(sk3.groupId, groupId)
        assert.equal(sk3.nextGroupId, groupId2)
        assert.equal(sk.wkAddr,sk3.wkAddr);
        await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
    })
})

