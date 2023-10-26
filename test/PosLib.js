'use strict'

const assert = require('assert')
const PosLib = artifacts.require('test/FakePosLib')



contract('PosLib', async (accounts) => {

    let  pos

    before("init contracts", async() => {
        pos = await PosLib.new();
    })


    it.skip('T1 getEpochId ', async ()=>{
        let seconds = 240
        let v = await pos.getEpochId(seconds)
        console.log("v:", v);
        assert.equal(v, seconds/120, "getEpochId failed")
    })


})
