const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { registerStart,stakeInPre, setupNetwork,g, deploySmg, timeWaitSelect, expectRevert, expectEvent} = require('../base.js');
const { assert } = require("chai");

contract('StoremanGroupDelegate stakeIn', async () => {

    let  smg
    let groupId, groupInfo

    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        groupId = await registerStart(smg);
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        
    })

    it('stakeInPre', async ()=>{ // stakeIn 50000
        let sw = {addr:g.wks[1], pk:g.pks[1]}
        let tx = smg.connect(g.signers[3]).stakeIn(groupId, sw.pk, sw.pk,{value:50000})
        await expectRevert(tx, "invalid sender");
        await stakeInPre(smg, groupId)
    })
    it('T1', async ()=>{ // stakeIn 50000
        let wk = utils.getAddressFromInt(15001)
        let tx;
        wk.pk = "0x04db7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170c4";
        tx = smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid PK");
        wk.pk = "0x04db7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170";
        tx = smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid PK");

        wk.pk = "0xdb7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170c5";
        tx = smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid PK");



        let wk0 = utils.getAddressFromInt(18001)
        wk.pk = "0x04db7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170c4";
        tx = smg.stakeIn(groupId, wk0.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid enodeID");
        wk.pk = "0x04db7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170";
        tx = smg.stakeIn(groupId, wk0.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid enodeID");

        wk.pk = "0xdb7432110ba814bfe6371ddfd03ba554b558548aa90e81b8e1421321656065a88236f24d965a900384b382e8d772d7e92dee2ce6c3cb33883ea627d54a5170c5";
        tx = smg.stakeIn(groupId, wk0.pk, wk.pk,{value:50000});
        await expectRevert(tx, "invalid enodeID");



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
        await timeWaitSelect(groupInfo);
        let wk = utils.getAddressFromInt(10009)
        let tx =  smg.stakeIn(groupId, wk.pk, wk.pk,{value:60000});
        await expectRevert(tx, "Registration closed")
    })


})
