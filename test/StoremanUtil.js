'use strict'

const assert = require('assert')
const StoremanUtil = artifacts.require('StoremanUtil')



contract('StoremanUtil', async (accounts) => {

    let  smgUtil

    before("init contracts", async() => {
        smgUtil = await StoremanUtil.deployed();
    })


    it('T1 getDaybyTime ', async ()=>{
        let v = await smgUtil.getDaybyTime(60*60*24)
        console.log("v:", v);
        assert.equal(v, 60*60*24, "getDaybyTime failed")
    })

    it('T2 calSkWeight ', async ()=>{
        let v = await smgUtil.calSkWeight(10, 15000)
        console.log("v:", v);
        assert.equal(v, 15, "calSkWeight failed")
    })
})
