const utils = require("./utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');



const { registerStart,stakeInPre, setupNetwork, } = require('./basee.js')




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

    it('stakeIn', async ()=>{ 
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })
    it('T1', async ()=>{ // stakeAppend 10000
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeAppend(wk.addr,{value:10000});
        console.log("tx:", tx);
    })
    it('T2', async ()=>{ // stakeAppend 10
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeAppend(wk.addr,{value:10});
        console.log("tx:", tx);
    })

})
