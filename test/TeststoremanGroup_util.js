

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const StoremanUtil = artifacts.require('StoremanUtil')


const { registerStart } = require('./basee.js')

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/



contract('TestSmg', async () => {

    let  smg
    let smgUtil
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        smgUtil = await StoremanUtil.deployed();
    })


    it('getDaybyTime ', async ()=>{
        let time = 1597891837;
        let day = await smgUtil.getDaybyTime(time);
        console.log("day is ", day.toString(10))
    })
    it('calSkWeight ', async ()=>{
        let d = 10000;
        let w = await smgUtil.calSkWeight(15000,d);
        console.log("weight is ", w.toString(10))
    })

})
