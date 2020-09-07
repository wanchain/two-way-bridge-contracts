const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { registerStart,stakeInPre, setupNetwork,g,  timeSetSelect} = require('../base.js');
const { assert } = require("chai");

contract('StoremanGroupDelegate stakeIn', async () => {

    let  smg
    let groupId, groupInfo

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        
    })

    it('stakeInPre', async ()=>{ // stakeIn 50000
        let sw = {addr:g.wks[1], pk:g.pks[1]}
        let tx = smg.stakeIn(groupId, sw.pk, sw.pk,{from:g.sfs[2], value:50000})
        await expectRevert(tx, "invalid sender");
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
    it('T8', async ()=>{ 
        let ugroup = utils.stringTobytes32("none")
        let wk = utils.getAddressFromInt(10004)
        let tx =  smg.stakeIn(ugroup, wk.pk, wk.pk,{value:60000});
        await expectRevert(tx, "invalid group")
    })
    it('T9 stakeIn after register duration', async ()=>{ 
        await timeSetSelect(groupInfo);
        let wk = utils.getAddressFromInt(10009)
        let tx =  smg.stakeIn(groupId, wk.pk, wk.pk,{value:60000});
        await expectRevert(tx, "Registration closed")
    })


})
