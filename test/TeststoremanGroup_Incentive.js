const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;


let gpk = '0xd32f34db1cf3d028742081db75fb32b16d3e2ed2c0ea868d8c26c529933edbd573de0a0c462ac15411e6ff7b9d2d2123c5321f1c2590852406ae831ca2e016b0';
const { registerStart,stakeInPre, web3url,g, toSelect, } = require('./base.js')

contract('TestSmg', async (accounts) => {
    let  smg
    let groupId
    let web3 = new Web3(new Web3.providers.HttpProvider(web3url))

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)

    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('stakeIn', async ()=>{
        let wk = utils.getAddressFromInt(10000)
        let tx = await smg.stakeIn(groupId, wk.pk, wk.pk,{value:50000});
        console.log("tx:", tx);
    })


    it('test toSelect', async ()=>{
        await toSelect(smg, groupId);
    })
    it('setGpk', async() => {
        await pu.sleep(2000)
        let tx =  await smg.setGpk(groupId, gpk, gpk, {from: g.leader})
       //console.log("setGpk tx:", tx)
    })
    it('test append', async()=>{
        let i=g.stakerCount-1;
        let sw = utils.getAddressFromInt(i+2000)
        let j = deCount-1;

        let de = utils.getAddressFromInt((i+1000)*10*1000 + j)

        txhash = await tryAddDelegator(smg, groupId, sw.addr, de, 3000);
        console.log("append txhash i j:", i,j, txhash)
        await utils.waitReceipt(txhash)
    })


    it('incentive ', async ()=>{
        await pu.sleep(6 * 1000)
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("count :", count)
        console.log("group:",await smg.getStoremanGroupInfo(groupId))

        for(let i=0; i<count; i++){
            let  skAddr = await smg.getSelectedSmInfo(groupId, i)
            console.log("skAddr:", skAddr)
            while(true){
                let tx = await smg.testIncentiveAll(groupId,skAddr['0'])
                let rec = await utils.waitReceipt(tx.tx);
                // console.log("rec:",rec.logs[0].topics[3]==1)
                // console.log("rec:",rec.logs[0].topics)
                // console.log("rec:",rec)
                if(rec.logs[0].topics[3]==1){
                    break;
                }
            }
        }


        for(let i=0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            console.log("skAddr:", i,skAddr)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("sk, i:", i, sk)

            let deCount = sk["9"] ;
            for(let k=0; k<deCount; k++) {
                let deAddr = await smg.getSmDelegatorAddr(groupId, skAddr[0], k)
                let de = await smg.getSmDelegatorInfo(groupId, skAddr[0], deAddr);
                    console.log("de:", k, de)

                let rc = de["1"];
                for(let c = 0; c<rc; c++){
                    let r = await smg.getSmDelegatorInfoRecord(groupId, skAddr[0], deAddr, c)
                    console.log("records", c, r["0"], r["1"])
                }
            }
        }

        let dayIncentive = await smg.checkGroupIncentive(groupId, now+1)
        console.log("dayIncentive: ", dayIncentive)

    })

})
