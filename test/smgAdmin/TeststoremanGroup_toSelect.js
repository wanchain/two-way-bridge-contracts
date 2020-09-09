const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;

const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');



const { registerStart,stakeInPre, g, toSelect, setupNetwork,timeWaitSelect} = require('../base.js')

contract('StoremanGroupDelegate select', async () => {
 
    let  smg
    let groupId
    let groupInfo;


    let wk1 = utils.getAddressFromInt(10001)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
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
        assert.equal(sk.wkAddr.toLowerCase(), wk1.addr, "the node should be second one")
    })
    it('T2', async ()=>{ 
        let tx = await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:55000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr.toLowerCase(), wk2.addr, "the node should be third one")
    })
    it('T3', async ()=>{ 
        let wk = utils.getAddressFromInt(10003)
        let tx = await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr.toLowerCase(), wk3.addr, "the node should be second one")
    })
    it('T7 setInvalidSm', async ()=>{
        await smg.setDependence(g.admin, g.admin, g.admin,g.admin);
        let tx =  smg.setInvalidSm(groupId, [2],["0x02"], {from:g.owner});
        await expectRevert(tx, "Sender is not allowed");
  
        tx = await smg.setInvalidSm(groupId, [2],[5], {from:g.admin});
        console.log(" setInvalidSm tx:", tx)
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
        assert.equal(sn[0].wkAddr.toLowerCase(),g.leader,"the first one is wrong")
        assert.equal(sn[1].wkAddr.toLowerCase(),wk1.addr,"the second one is wrong")
        assert.equal(sn[2].wkAddr.toLowerCase(),wk3.addr,"the third one is wrong")
        assert.equal(sn[3].wkAddr.toLowerCase(),wk2.addr,"the fourth one is wrong")
    })

    it('T7 setInvalidSm', async ()=>{
        await smg.setDependence(g.admin, g.admin, g.admin,g.admin);
        let tx =  smg.setInvalidSm(groupId, [2],["0x02"], {from:g.owner});
        await expectRevert(tx, "Sender is not allowed");
        
        tx =  smg.setInvalidSm(groupId, [2],[2], {from:g.admin});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 1)

        tx =  smg.setInvalidSm(groupId, [2],[5], {from:g.admin});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 2)

        tx =  smg.setInvalidSm(groupId, [2],[5], {from:g.admin});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 3)
        assert.equal(groupInfo.status, g.storemanGroupStatus.selected)
        
        tx =  smg.setInvalidSm(groupId, [2],[5], {from:g.admin});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        assert.equal(groupInfo.tickedCount, 3)
        assert.equal(groupInfo.status, g.storemanGroupStatus.failed)
        await smg.recordSmSlash(wk1.addr,{from:g.admin})
        await smg.recordSmSlash(wk1.addr,{from:g.admin})
    })

    it('checkCanStakeClaim', async ()=>{
        let f = await smg.checkCanStakeClaim(wk1.addr);
        console.log("checkCanStakeClaim:", f)
        assert.equal(f, true,"checkCanStakeClaim")

        let tx = await smg.stakeClaim(wk1.addr);
        expectEvent(tx, 'stakeIncentiveClaimEvent')
        console.log("tx stakeClaim:", tx.logs[0].args)
    })

})
