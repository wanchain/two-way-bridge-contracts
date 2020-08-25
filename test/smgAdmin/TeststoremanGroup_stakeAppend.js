const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require("assert")
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const Web3 = require('web3')
const { registerStart,stakeInPre, setupNetwork, g} = require('../basee.js')


let web3 = new Web3()

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
        expectEvent(tx, 'stakeAppendEvent', {wkAddr:web3.utils.toChecksumAddress(wk.addr), from:g.owner,value:new BN(10000)})
        let ski = await smg.getSelectedSmInfo(groupId, 1);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        assert.equal(sk.deposit.toString(10), "60000", "deposit is wrong" )
    })
    it('T2', async ()=>{ // stakeAppend 10
        let wk = utils.getAddressFromInt(10001)
        let tx = await smg.stakeAppend(wk.addr,{value:10});
        console.log("tx:", tx);
        let ski = await smg.getSelectedSmInfo(groupId, 1);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        console.log("sk.deposit:", sk.deposit.toString(10))
        assert.equal(sk.deposit.toString(10), "60010", "deposit is wrong" )
    })

})
