

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');




const { registerStart } = require('./basee.js')

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/



contract('TestSmg', async () => {

    let  smg

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)

    })


    it('registerStart_1 ', async ()=>{
        let groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })


})
