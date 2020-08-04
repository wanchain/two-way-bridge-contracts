const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const pu = require('promisefy-util')
const assert = require('chai').assert;

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;



const { registerStart,stakeInPre, web3url,g, toSelect, } = require('./basee.js')

contract('StoremanGroupDelegate', async (accounts) => {
 
    let  smg
    let groupId
    let web3 = new Web3(new Web3.providers.HttpProvider(web3url))

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
    it('T1', async ()=>{ 
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:60000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 1);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr, "the node should be second one")
    })
    it('T2', async ()=>{ 
        let wk = utils.getAddressFromInt(10002)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:55000});
        console.log("tx:", tx);

        let sk = await smg.getSelectedSmInfo(groupId, 2);
        assert.equal(sk.wkAddr.toLowerCase(), wk.addr, "the node should be third one")
    })
    it('test select', async ()=>{
        await toSelect(smg, groupId);
    })
})
