'use strict'

const CommonTool = artifacts.require('CommonTool');
const TestCommonTool = artifacts.require('TestCommonTool');

const { assert, expect } = require("chai");


contract('CommonTools', async (accounts) => {

    let  common

    before("init contracts", async() => {
        let CommonTool = await ethers.getContractFactory("CommonTool")
        let commonTool = await CommonTool.deploy()
        await commonTool.deployed()
    
        let TestCommonTool = await ethers.getContractFactory("TestCommonTool",{
          libraries:{
            CommonTool:commonTool.address,
          }
        })

        common = await TestCommonTool.deploy()
        await common.deployed()
    })


    it('T1 CommonTools ', async ()=>{
        let s = '0x303132'
        let d = await common.bytesToBytes32(s)
        assert.equal(d, '0x3031320000000000000000000000000000000000000000000000000000000000', 'bytesToBytes32 failed')

        let f = await common.cmpBytes('0x3132', '0x3132');
        assert.equal(f, true)
        f = await common.cmpBytes('0x313233', '0x3132');
        assert.equal(f, false, 'cmpBytes')
        f = await common.cmpBytes('0x313233', '0x313234');
        assert.equal(f, false, 'cmpBytes')
        f = await common.cmpBytes('0x313233', '0x31323334');
        assert.equal(f, false, 'cmpBytes')
    })


})
