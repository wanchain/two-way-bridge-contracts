const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');


const { registerStart,stakeInPre, g, setupNetwork } = require('../basee.js')


contract('TestSmg', async () => {

    let  smg
    let groupId
    let wk = utils.getAddressFromInt(10000)

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

    it('stakeIn', async ()=>{
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
        let count = await smg.getSelectedSmNumber(groupId);
        assert.equal(count,g.memberCountDesign, "selected count is wrong")
        for(let i=0; i<count; i++){
            let sk = await smg.getSelectedSmInfo(groupId, i);
            assert.notEqual(sk.wkAddr.toLowerCase(), wk.addr,"select wrong")
        }
    })

    it('partIn', async ()=>{
        let tx = await smg.partIn(wk.addr,{value:100});
        console.log("tx:", tx);
        let count = await smg.getSelectedSmNumber(groupId);
        assert.equal(count,g.memberCountDesign, "selected count is wrong")
        let sk0 = await smg.getSelectedSmInfo(groupId, 0);
        assert.equal(sk0.wkAddr.toLowerCase(), g.leader, "leader is wrong");
        let sk1 = await smg.getSelectedSmInfo(groupId, 1);
        assert.equal(sk1.wkAddr, wk.addr, "First One is wrong");
        for(let i=2; i<count; i++){
            let sk = await smg.getSelectedSmInfo(groupId, i);
            assert.notEqual(sk.wkAddr.toLowerCase(), wk.addr,"select wrong")
        }
    })

})
