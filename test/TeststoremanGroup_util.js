

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const StoremanUtil = artifacts.require('StoremanUtil')


const { registerStart, stakeInPre} = require('./basee.js')

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

    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
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
        assert(w, 15000, "calSkWeight failed")
    })
    it('getSelectedSmNumber ', async ()=>{
        let w = await smg.getSelectedSmNumber(groupId);
        console.log("getSelectedSmNumber is ", w)
        assert(w, 4, "getSelectedSmNumber failed")
    })


    
    it('getSelectedStoreman ', async ()=>{
        let w = await smg.getSelectedStoreman(groupId);
        console.log("getSelectedStoreman is ", w)
    })

})
