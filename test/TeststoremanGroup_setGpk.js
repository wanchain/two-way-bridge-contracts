const utils = require("./utils");

const TestSmg = artifacts.require('TestSmg')

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const { registerStart,stakeInPre,  toSelect, } = require('./basee.js')


contract('TestSmg', async () => {
    let  smg
    let groupId

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
        let tx = await toSelect(smg, groupId);
        console.log("select tx:", tx)
    })



})
