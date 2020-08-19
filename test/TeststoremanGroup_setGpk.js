const utils = require("./utils");

const TestSmg = artifacts.require('TestSmg')

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');



/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/


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
        let tx = await toSelect(groupId);
        console.log("select tx:", tx)
        await utils.waitReceipt(tx.tx)
    })

    it('testSetGpk', async() => {
        let tsmg = await TestSmg.deployed();
        let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
        let tx =  await tsmg.testSetGpk(id, gpk, gpk)
        console.log("tx:", tx)
    })

})
