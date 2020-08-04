const utils = require("./utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;


const { registerStart,registerStart2,stakeInPre, web3url,g, toSelect, } = require('./basee.js')

contract('StoremanGroupDelegate', async (accounts) => {
 
    let  smg
    let groupId
    let groupId2

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)

    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    it('test select', async ()=>{
        await toSelect(smg, groupId);
    })
    it('registerStart2', async ()=>{
        groupId2 = await registerStart2(smg, groupId, [], []);
        console.log("groupId2: ", groupId2)
    })
    it('T4', async ()=>{ 
        let wk = utils.getAddressFromInt(20001)
        let tx = await smg.stakeIn(groupId2, wk.pk, wk.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId2, 1);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr, "the node should be second one")
    })
    it('T5 select2', async ()=>{
        await toSelect(smg, groupId2);
        let count = await smg.getSelectedSmNumber(groupId2)
        console.log("slected sm number: %d", count);  
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId2, i)
            
            //console.log("selected node %d: %O", i, skAddr);
            let sk = await smg.getStoremanInfo(skAddr[0]);
            //console.log("storeman %d info: %O", i, sk);
        }  
    })
})
