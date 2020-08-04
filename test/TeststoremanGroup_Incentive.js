const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;


let gpk = '0xd32f34db1cf3d028742081db75fb32b16d3e2ed2c0ea868d8c26c529933edbd573de0a0c462ac15411e6ff7b9d2d2123c5321f1c2590852406ae831ca2e016b0';
const { registerStart,registerStart2,stakeInPre, web3url,g, toSelect, } = require('./basee.js');
const assert  = require("assert");
/*
奖励与时间相关．
假定ｈｔｌｃ工作９０天，　提前１４天开放ｓｔａｋｉｎｇ．　开放１０天．　然后ｓｅｌｅｃｔ，　然后４天用于产生ｇｐｋ．
*/
contract('TestSmg', async (accounts) => {
    let  smg
    let groupId
    let groupInfo

    let web3 = new Web3(new Web3.providers.HttpProvider(web3url))

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)

    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
        let group = await smg.getStoremanGroupInfo(groupId);
        let gt = await smg.getStoremanGroupTime(groupId);
        Object.assign(group, gt);
        console.log("group:", group);
        groupInfo = group;
        groupInfo.startTime = Number(groupInfo.startTime)
        groupInfo.endTime = Number(groupInfo.endTime)
        groupInfo.registerTime = Number(groupInfo.registerTime)
        groupInfo.registerDuration = Number(groupInfo.registerDuration)
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
        await utils.sleepUntil(1000*(groupInfo.registerTime+groupInfo.registerDuration));
        await toSelect(smg, groupId);
    })
    it('setGpk', async() => {
        await utils.sleepUntil(1000*(groupInfo.registerTime+groupInfo.registerDuration+2));
        let tx =  await smg.setGpk(groupId, gpk, gpk, {from: g.leader})
        console.log("setGpk tx:", tx.tx)
    })



    it('incentive ', async ()=>{
        await utils.sleepUntil(1000*(groupInfo.startTime+3));
        console.log("incentive until", 1000*(groupInfo.startTime+1))
        console.log("incentive time:", Date.now())
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("count :", count)
        assert.equal(count, g.memberCountDesign, "memberCountDesign is not equal")

        for(let i=0; i<count; i++){
            let  sk = await smg.getSelectedSmInfo(groupId, i)
            while(true){
                let tx = await smg.incentiveCandidator(sk.wkAddr)
                //console.log("===================tx", tx.receipt.logs)
                if(tx.receipt.logs[0].args.finished){
                    for(let day = groupInfo.startTime; day <= groupInfo.endTime; day++){
                        let skInc = await smg.getStoremanIncentive(sk.wkAddr, day)
                        console.log("===skInc:", skInc.toString(10))
                    }

                    break;
                }
            }

        }
        let inc = await smg.getGlobalIncentive();
        console.log("incentive global:", inc);
        for(let day = groupInfo.startTime; day <= groupInfo.endTime; day++){
            let dayIncentive = await smg.checkGroupIncentive(groupId, day)
            console.log("dayIncentive: ", day, dayIncentive)
            assert.equal(0x1c9c380, dayIncentive, "dayIncentive is incorrect")

        }
    })

})
