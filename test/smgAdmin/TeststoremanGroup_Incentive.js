const utils = require("../utils");
const Web3 = require('web3')

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');


let gpk = '0xd32f34db1cf3d028742081db75fb32b16d3e2ed2c0ea868d8c26c529933edbd573de0a0c462ac15411e6ff7b9d2d2123c5321f1c2590852406ae831ca2e016b0';
const { registerStart,stakeInPre, web3url,g, toSelect, setupNetwork} = require('../basee.js');
const assert  = require("assert");
/*
奖励与时间相关．
假定ｈｔｌｃ工作９０天，　提前１４天开放ｓｔａｋｉｎｇ．　开放１０天．　然后ｓｅｌｅｃｔ，　然后４天用于产生ｇｐｋ．
*/
contract('TestSmg', async () => {
    let  smg
    let groupId
    let groupInfo
    const posIncentive = "0x1c9c380"

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
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

        await smg.incentiveCandidator(g.leader)
    })


    it('test toSelect', async ()=>{
        await utils.sleepUntil(1000*(groupInfo.registerTime+groupInfo.registerDuration));
        await toSelect(smg, groupId);

        await smg.incentiveCandidator(g.leader)
    })
    it('setGpk', async() => {
        await utils.sleepUntil(1000*(groupInfo.registerTime+groupInfo.registerDuration+2));
        await smg.updateGroupStatus(groupId, 5);

        await smg.incentiveCandidator(g.leader)

        await utils.sleep(9000); await smg.incentiveCandidator(g.leader)
    })



    it.skip('incentive ', async ()=>{
        await utils.sleepUntil(1000*(groupInfo.startTime+3));
        console.log("incentive until", 1000*(groupInfo.startTime+1))
        let nowDay = parseInt(Date.now()/1000)
        console.log("incentive time nowDay:", nowDay)
        let count = await smg.getSelectedSmNumber(groupId)
        console.log("count :", count)
        assert.equal(count, g.memberCountDesign, "memberCountDesign is not equal")
        let fromDay, endDay
        for(let i=0; i<count; i++){
            let  sk = await smg.getSelectedSmInfo(groupId, i)
             console.log(" node ================================", i)
            while(true){
                let tx = await smg.incentiveCandidator(sk.wkAddr)
                console.log("===================tx", tx.receipt.logs)
                if(tx.receipt.logs[0].args.finished){
                    fromDay = tx.receipt.logs[0].args.from
                    endDay = tx.receipt.logs[0].args.end
                    for(let day = fromDay; day <= endDay; day++){
                        let skInc = await smg.getStoremanIncentive(sk.wkAddr, day)
                        console.log("===skInc, day:", skInc.toString(10))
                        assert.equal(skInc, Number(posIncentive)/g.memberCountDesign, "node incentive is wrong")
                    }

                    break;
                }
            }

        }
        let inc = await smg.getGlobalIncentive();
        console.log("incentive global:", inc);
        for(let day = fromDay; day <= endDay; day++){
            let dayIncentive = await smg.checkGroupIncentive(groupId, day)
            console.log("dayIncentive: ", day, dayIncentive)
            assert.equal(posIncentive, '0x'+dayIncentive.toString(16), "dayIncentive is incorrect")

        }
    })

})
