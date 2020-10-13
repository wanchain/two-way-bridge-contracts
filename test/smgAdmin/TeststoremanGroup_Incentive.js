const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const FakeMetric = artifacts.require('FakeMetric');
const FakePosLib = artifacts.require('FakePosLib');
const fakeQuota = artifacts.require('fakeQuota');
const GpkProxy = artifacts.require('GpkProxy');

const { expectRevert, expectEvent , BN} = require('@openzeppelin/test-helpers');

const {
    registerStart,
    stakeWhiteList,
    g,
    toSelect,toDelegateIn,toPartIn, toDelegateClaim, toPartClaim,
    setupNetwork,stakeInPre,timeWaitSelect, timeWaitIncentive,
    initTestValue
} = require('../base.js');

const { assert } = require('chai');

const ERROR_INFO = 'it should be throw error';
const ERROR_GROUP_ID_1 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 1"), 64);
const ERROR_GROUP_ID_2 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 2"), 64);
const ERROR_GROUP_ID_3 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 3"), 64);

const delegatorCounts = 100;
const memberCountDesign = 4;
const threshold = 3;
// let leftStakeCount = memberCountDesign + g.whiteCountAll;
let leftStakeCount = memberCountDesign;

/*
奖励与时间相关．
假定ｈｔｌｃ工作９０天，　提前１４天开放ｓｔａｋｉｎｇ．　开放１０天．　然后ｓｅｌｅｃｔ，　然后４天用于产生ｇｐｋ．
*/
contract.skip('Test Storeman Group Incentive', async (accounts) => {
    let smgInstance;
    let groupId;
    let posIncentive;
    let whiteStakeAddrOffset;
    let currStakeAddrOffset;
    let currDelegateAddrOffset;
    let wks;
    let delegators;

    before("init contracts success:", async () => {
        posIncentive = "0x1c9c380";
        whiteStakeAddrOffset = g.whiteAddrStartIdx;
        currStakeAddrOffset = g.otherAddrOffset;
        currDelegateAddrOffset = currStakeAddrOffset * 2;
        delegators = {};
        wks = {
            loser: utils.getAddressFromInt(++currStakeAddrOffset),
            one: utils.getAddressFromInt(++currStakeAddrOffset),
            many: utils.getAddressFromInt(++currStakeAddrOffset),
            others: []
        };
        let smgProxy = await StoremanGroupProxy.deployed();
        smgInstance = await StoremanGroupDelegate.at(smgProxy.address);
        // initTestValue("memberCountDesign", memberCountDesign);
        // initTestValue("threshold", threshold);
        // initTestValue("stakerCount", g.memberCountDesign + g.whiteBackup);
        await setupNetwork();
        console.log("accounts length", accounts.length);
        console.log("ready");
    });

    // TODO:
    it('incentiveCandidator before group register, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(g.leader,{from: g.leader});
            assert.fail(ERROR_INFO);
        } catch (e) {
            assert.include(e.toString(), "not ready");
        }
    });

    it('select storeman before group register, should fail', async () => {
        try {
            await smgInstance.select(ERROR_GROUP_ID_1,{from: g.leader});
            assert.fail(ERROR_INFO);
        } catch (e) {
            assert.include(e.toString(), "Wrong status");
        }
    });

    it('select storeman while register storeman group stage, should fail', async () => {
        let currGroupId = await registerStart(smgInstance, 0, {
            groupId: ERROR_GROUP_ID_1,
        });
        console.log("get group id", currGroupId);
        console.log("pad group id", ERROR_GROUP_ID_1);
        assert.equal(currGroupId, ERROR_GROUP_ID_1, "check group ID failed");
        let currGroup = await smgInstance.getStoremanGroupInfo(currGroupId);
        assert.equal(currGroup.groupId, ERROR_GROUP_ID_1, "check the queried group ID failed");
        console.log("currGroup", currGroup)
        let currTime = parseInt(Date.now() / 1000);
        console.log("currTime", currTime);
        let leftTime = Number(currGroup.registerTime) + Number(currGroup.registerDuration) - currTime;
        console.log("registerTime + registerDuration - currTime =", leftTime);

        if (leftTime > 0) {
            try {
                await smgInstance.select(currGroupId,{from: g.leader});
                assert.fail(ERROR_INFO);
            } catch (e) {
                // console.log(e);
                assert.include(e.toString(), "Wrong time");
            }
        }
    });

    it('select storeman without stakeIn, should fail', async () => {
        let currGroupId = await registerStart(smgInstance, whiteStakeAddrOffset, {
            groupId: ERROR_GROUP_ID_2,
        });
        assert.equal(currGroupId, ERROR_GROUP_ID_2, "check group ID failed");

        let currGroup = await smgInstance.getStoremanGroupInfo(currGroupId);
        assert.equal(currGroup.groupId, ERROR_GROUP_ID_2, "check the queried group ID failed");
        console.log("currGroup", currGroup)

        // let currTime = parseInt(Date.now() / 1000);
        // let sleepTime = 1000 * (Number(currGroup.registerTime) + Number(currGroup.registerDuration) - currTime) + 1;
        // console.log("=================================sleep", sleepTime, "ms");
        // await utils.sleep(sleepTime);
        await utils.sleepUntil(1000 * (Number(currGroup.registerTime) + Number(currGroup.registerDuration) + 1));

        await smgInstance.select(currGroupId,{from: g.leader});
        currGroup = await smgInstance.getStoremanGroupInfo(currGroupId);
        assert.equal(currGroup.status, g.storemanGroupStatus.failed, "group status should be failed");
    });

    it('register storeman group success', async () => {
        groupId = await registerStart(smgInstance, whiteStakeAddrOffset, {
        });
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("group:", group);
    });

    // TODO:
    it('incentiveCandidator before stakeIn, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(g.leader)
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "not ready");
        }
    });

    it('stake white list success', async () => {
        console.log("before leftStakeCount", leftStakeCount);
        let currStakeCount = await stakeWhiteList(smgInstance, groupId, whiteStakeAddrOffset, memberCountDesign + g.whiteBackup);
        assert.equal(currStakeCount, g.whiteCountAll, "stake white list count error");
        leftStakeCount -= currStakeCount;
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("after leftStakeCount", leftStakeCount, "group", currGroup);
    });

    it('[one-delegator] one staker stakeIn with one delegator success', async () => {
        console.log("before leftStakeCount", leftStakeCount);
        let tx = await smgInstance.stakeIn(groupId, wks.one.pk, wks.one.pk, {value:g.minStakeIn * 2});
        leftStakeCount -= 1;
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("after leftStakeCount", leftStakeCount, "group", currGroup);

        // let d = utils.getAddressFromInt(++currDelegateAddrOffset);
        // await web3.eth.sendTransaction({from: g.owner, to: d.addr, value: g.minDelegateIn});

        // let tx = await smgInstance.delegateIn(wks.one.addr,{value:g.minDelegateIn});
        // assert.equal(tx.receipt.logs[0].event, 'delegateInEvent', "check delegateIn event name failed")
        // // console.log("delegator", d.addr, " delegateIn tx:", tx);

        // if (!delegators[wks.one.addr]) {
        //     delegators[wks.one.addr] = [];
        // }
        // delegators[wks.one.addr].push(d);

    });

    it('[multi-delegator] one staker stakeIn with much more delegator success', async () => {
        console.log("before leftStakeCount", leftStakeCount);
        let tx = await smgInstance.stakeIn(groupId, wks.many.pk, wks.many.pk, {value:g.minStakeIn * 2});
        leftStakeCount -= 1;
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("after leftStakeCount", leftStakeCount, "group", currGroup);
    });

    it('[common-staker] multi staker stakeIn success', async () => {
        console.log("before leftStakeCount", leftStakeCount);
        let i = 0;
        for (; i < leftStakeCount; ++i) {
            let stakeValue = g.minStakeIn + i;
            let currStakeAddr = utils.getAddressFromInt(++currStakeAddrOffset);
            wks.others.push(currStakeAddr);
            let tx = await smgInstance.stakeIn(groupId, currStakeAddr.pk, currStakeAddr.pk, {value:stakeValue});
            // console.log("tx:", tx);
        }
        leftStakeCount -= i
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("after leftStakeCount", leftStakeCount, "group", currGroup);
    });

    it('[loser-staker] one stake loser stakeIn with min value success', async () => {
        console.log("before leftStakeCount", leftStakeCount);
        await smgInstance.stakeIn(groupId, wks.loser.pk, wks.loser.pk,{value:g.minStakeIn});
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("after leftStakeCount", leftStakeCount, "group", currGroup);
    });

    it('[one-delegator] delegateIn success', async () => {
        let d = utils.getAddressFromInt(++currDelegateAddrOffset);
        await web3.eth.sendTransaction({from: g.owner, to: d.addr, value: g.minDelegateIn});

        let tx = await smgInstance.delegateIn(wks.one.addr,{value:g.minDelegateIn});
        assert.equal(tx.receipt.logs[0].event, 'delegateInEvent', "check delegateIn event name failed")
        // console.log("delegator", d.addr, " delegateIn tx:", tx);

        if (!delegators[wks.one.addr]) {
            delegators[wks.one.addr] = [];
        }
        delegators[wks.one.addr].push(d);
    });

    it('[multi-delegator] delegateIn success', async () => {
        for (let i = 0; i < delegatorCounts; ++i) {
            let d = utils.getAddressFromInt(++currDelegateAddrOffset);
            await web3.eth.sendTransaction({from: g.owner, to: d.addr, value: g.minDelegateIn});

            let tx = await smgInstance.delegateIn(wks.many.addr,{value:g.minDelegateIn});
            assert.equal(tx.receipt.logs[0].event, 'delegateInEvent', "check delegateIn event name failed")
            // console.log("delegator", d.addr, " delegateIn tx:", tx);

            if (!delegators[wks.many.addr]) {
                delegators[wks.many.addr] = [];
            }
            delegators[wks.many.addr].push(d);
        }
        // console.log("currDelegateAddrOffset", currDelegateAddrOffset);
    });

    // TODO:
    it('incentiveCandidator before select, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(g.leader)
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "not ready");
        }
    });

    it('select storeman sucess', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        await utils.sleepUntil(1000 * (Number(group.registerTime) + Number(group.registerDuration) + 1));

        let tx = await smgInstance.select(groupId,{from: g.leader});
        console.log("group %s select tx:", groupId, tx);
        console.log("group %s select tx:", groupId, JSON.stringify(tx));
        console.log("group %s select tx hash:", groupId, tx.tx);
    });

    it('check toSelect sucess', async () => {
        let currGroup = await smgInstance.getStoremanGroupInfo(groupId);
        console.log("currGroup", currGroup);
        assert.equal(Number(currGroup.status), g.storemanGroupStatus.selected, "group status error");

        let selectedCount = await smgInstance.getSelectedSmNumber(groupId);
        console.log("selectedCount", Number(selectedCount));
        console.log("memberCountDesign", Number(currGroup.memberCountDesign));
        assert.equal(Number(selectedCount), Number(currGroup.memberCountDesign), "memberCountDesign is not equal");
        selectedCount = Number(selectedCount);

        for(let i = 0; i < selectedCount; ++i) {
            let selectedSmInfo = await smgInstance.getSelectedSmInfo(groupId, i);
            // console.log("selectedSmInfo", selectedSmInfo, Object.keys(selectedSmInfo));
            let smInfo = await smgInstance.getStoremanInfo(selectedSmInfo.wkAddr);
            // console.log("smInfo", smInfo);
            assert.equal(smInfo.enodeID, selectedSmInfo.enodeId, "check storeman encodeID failed");
            assert.equal(smInfo.PK, selectedSmInfo.PK, "check storeman PK failed");
            if (i < g.whiteCount) {
                assert.equal(smInfo.isWhite, true, "[white] check storeman isWhite failed");
            } else {
                assert.equal(smInfo.isWhite, false, "check storeman isWhite failed");
            }
            assert.equal(smInfo.groupId, groupId, "check group ID failed");
            assert.notEqual(wks.loser.addr, selectedSmInfo.wkAddr);
        }
    });

    // TODO:
    it('incentiveCandidator before ready, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(g.leader)
            assert.fail(ERROR_INFO);
        } catch (e) {
            assert.include(e.toString(), "not ready");
        }
    });

    it('setGpk success', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        await utils.sleepUntil(1000 * (Number(group.registerDuration) + Number(group.registerTime)));

        await smgInstance.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from: g.admin});
    });

    // it('reward storeman group success', async () => {
    //     // for (let i = 0; i < g.htlcDuration*g.timeBase; ++i) {
    //         let smgTransferReceipt = await smgInstance.smgTransfer(groupId, {value: g.memberCountDesign * 1000000});
    //         // console.log("smgTransfer", smgTransferReceipt)
    //         // console.log("smgTransfer logs", smgTransferReceipt.logs)
    //         // await utils.sleep(1000);
    //     // }
    // });

    it.skip('incentiveCandidator by wkAddr not selected, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(wks.loser.addr)
            assert.fail(ERROR_INFO);
        } catch (e) {
            assert.include(e.toString(), "not selected");
        }
    });

    it.skip('[one-delegator] incentiveCandidator by storeman sucess', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        await utils.sleepUntil(1000 * Number(group.endTime));

        while (true) {
            let tx = await smgInstance.incentiveCandidator(wks.one.addr);
            console.log("===================tx", tx.receipt.logs);
            if(tx.receipt.logs[0].args.finished) {
                fromDay = tx.receipt.logs[0].args.from.toNumber();
                endDay = tx.receipt.logs[0].args.end.toNumber();
                console.log("fromDay", fromDay, "endDay", endDay);
                for(let day = fromDay; day <= endDay; ++day){
                    let smInc = await smgInstance.getStoremanIncentive(wks.one.addr, day)
                    console.log("===skInc, day:", smInc.toString(10))
                    assert.equal(smInc.toNumber(), parseInt(Number(posIncentive)/Number(group.memberCountDesign)), "node incentive is wrong")
                }
                break;
            }
        }
        let inc = await smgInstance.getGlobalIncentive();
        console.log("incentive global:", inc);
        for(let day = fromDay; day <= endDay; day++){
            let dayIncentive = await smgInstance.checkGroupIncentive(groupId, day)
            console.log("dayIncentive: ", day, dayIncentive)
            assert.equal(posIncentive, '0x'+dayIncentive.toString(16), "dayIncentive is incorrect")
        }
    });

    it.skip('[multi-delegator] incentive candidator sucess', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        let tx = await smgInstance.incentiveCandidator(wks.many.addr)
        console.log("===================tx", tx.receipt.logs)
        assert.equal(tx.receipt.logs[0].args.finished, false, "check finished failed");
        // if(tx.receipt.logs[0].args.finished){
        //     fromDay = tx.receipt.logs[0].args.from
        //     endDay = tx.receipt.logs[0].args.end
        //     for(let day = fromDay; day <= endDay; ++day){
        //         let smInc = await smgInstance.getStoremanIncentive(wks.many.addr, day)
        //         console.log("===skInc, day:", smInc.toString(10))
        //         assert.equal(smInc, Number(posIncentive)/Number(group.memberCountDesign), "node incentive is wrong")
        //     }
        //     break;
        // }
        // let inc = await smgInstance.getGlobalIncentive();
        // console.log("incentive global:", inc);
        // for(let day = fromDay; day <= endDay; day++){
        //     let dayIncentive = await smgInstance.checkGroupIncentive(groupId, day)
        //     console.log("dayIncentive: ", day, dayIncentive)
        //     assert.equal(posIncentive, '0x'+dayIncentive.toString(16), "dayIncentive is incorrect")
        // }
    });

    it.skip('total incentive candidator sucess', async () => {
        let nowDay = parseInt(Date.now()/1000)
        console.log("incentive time nowDay:", nowDay)
        let count = await smgInstance.getSelectedSmNumber(groupId);
        count = Number(count);
        console.log("count :", count)
        assert.equal(count, memberCountDesign, "memberCountDesign is not equal")
        let fromDay, endDay
        for(let i=0; i<count; i++){
            let  sk = await smgInstance.getSelectedSmInfo(groupId, i)
             console.log(" node ================================", i)
            while(true){
                let tx = await smgInstance.incentiveCandidator(sk.wkAddr)
                console.log("===================tx", tx.receipt.logs)
                if(tx.receipt.logs[0].args.finished){
                    fromDay = tx.receipt.logs[0].args.from
                    endDay = tx.receipt.logs[0].args.end
                    for(let day = fromDay; day <= endDay; day++){
                        let skInc = await smgInstance.getStoremanIncentive(sk.wkAddr, day)
                        console.log("===skInc, day:", skInc.toString(10))
                        assert.equal(skInc, Number(posIncentive)/memberCountDesign, "node incentive is wrong")
                    }

                    break;
                } else {
                    console.log("too more node incentive, take many times");
                }
            }

        }
        let inc = await smgInstance.getGlobalIncentive();
        console.log("incentive global:", inc);
        for(let day = fromDay; day <= endDay; day++){
            let dayIncentive = await smgInstance.checkGroupIncentive(groupId, day)
            console.log("dayIncentive: ", day, dayIncentive)
            assert.equal(posIncentive, '0x'+dayIncentive.toString(16), "dayIncentive is incorrect")
        }
    });

});


contract('incentive not selected', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)
    let wk4 = utils.getAddressFromInt(10004)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:80000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:70000});
        await smg.stakeIn(groupId, wk4.pk, wk4.pk,{value:70000});
        await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:50000});
        // await toDelegateIn(smg, wk.addr, index=30000,count=517)
        // await toPartIn(smg, wk.addr)
        let info = await smg.getStoremanInfo(wk.addr);
        console.log("sk info:", info)
    })  


    it('prpare', async ()=>{
      await timeWaitSelect(groupInfo);
      await toSelect(smg, groupId);
      await smg.updateGroupStatus(groupId,g.storemanGroupStatus.ready,{from:g.admin})
    })
    it('stakeIn 2', async ()=>{
        let groupInfo = await smg.getStoremanGroupInfo(groupId)
        if(groupInfo.status < g.storemanGroupStatus.selected){
            await timeWaitSelect(groupInfo)
            await toSelect(smg, groupId);
        }
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin})

        let second = 1+parseInt(groupInfo.endTime)
        await utils.sleepUntil(second*1000)

        let tx = smg.incentiveCandidator(wk3.addr);
        await expectRevert(tx, "not selected")
    })

    it('check incentive ', async ()=>{
      await timeWaitIncentive(smg, groupId, wk2.addr);
      await timeWaitIncentive(smg, groupId, wk.addr);
      await timeWaitIncentive(smg, groupId, g.leader);
    })
    
})



contract('incentive metric', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:100000});

    })  


    it('prpare', async ()=>{
      await timeWaitSelect(groupInfo);
      await toSelect(smg, groupId);
      await smg.updateGroupStatus(groupId,g.storemanGroupStatus.ready,{from:g.admin})
    })
    it('stakeIn', async ()=>{
        let metric = await FakeMetric.deployed();
        let gpkProxy = await GpkProxy.deployed();
        let pos = await FakePosLib.deployed();
        let quota = await fakeQuota.deployed();
        await smg.setDependence(metric.address, gpkProxy.address, quota.address,pos.address);
        let second = parseInt(groupInfo.endTime)
        await utils.sleepUntil(second*1000)
        let tx = await smg.incentiveCandidator(wk.addr);

        await metric.setC0(8)
        await metric.setC1(8)
        tx = await smg.incentiveCandidator(wk2.addr);

        await metric.setC0(8)
        await metric.setC1(2)
        tx = await smg.incentiveCandidator(wk3.addr);   
    })


    
})




contract('incentive not ready', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)

    })

    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});

        let tx =  smg.incentiveCandidator(wk.addr);
        await expectRevert(tx, "not ready")
    }) 



})


contract('incentive rotate', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)

    })

    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
    }) 

    it('stakeIn 2', async ()=>{
        let groupInfo = await smg.getStoremanGroupInfo(groupId)
        if(groupInfo.status < g.storemanGroupStatus.selected){
            await timeWaitSelect(groupInfo)
            await toSelect(smg, groupId);
        }
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin})

        let second = 1+parseInt(groupInfo.endTime)
        await utils.sleepUntil(second*1000)
        await registerStart(smg, 0, {preGroupId:groupId});
        await smg.storemanGroupDismiss(groupId, {from:g.admin});

        let tx = await smg.incentiveCandidator(wk.addr);
        expectEvent(tx, "incentiveEvent")
    })



})


contract('incentive rotate2', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:10});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)

    })

    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
    }) 

    it('stakeIn 2', async ()=>{
        let groupInfo = await smg.getStoremanGroupInfo(groupId)
        if(groupInfo.status < g.storemanGroupStatus.selected){
            await timeWaitSelect(groupInfo)
            await toSelect(smg, groupId);
        }
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin})

        let second = 1+parseInt(groupInfo.endTime)
        await utils.sleepUntil(second*1000)
        await registerStart(smg);
        await smg.storemanGroupDismiss(groupId, {from:g.admin});

        let tx = await smg.incentiveCandidator(wk.addr);
        expectEvent(tx, "incentiveEvent")
    })



})




contract('incentive incentive value check', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)
    let de1 = utils.getAddressFromInt(30000)
    let part1 = utils.getAddressFromInt(40000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:0});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:250000});
        await toDelegateIn(smg, wk.addr, index=30000,count=5, value=15000)
        await toPartIn(smg, wk.addr,index=40000,count=5)

        let info = await smg.getStoremanInfo(wk.addr);
        console.log("sk info:", info)

        info = await smg.getSmPartnerInfo(wk.addr, part1.addr)
        console.log("partner info:", info)

        info = await smg.getSmDelegatorInfo(wk.addr, de1.addr)
        console.log("delegator info:", info)
    })  

    it('check incentive ', async ()=>{
        let endIncentive;
        await timeWaitIncentive(smg, groupId, wk3.addr);
        endIncentive = await smg.getStoremanIncentive(wk3.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 12500000)

        await timeWaitIncentive(smg, groupId, wk2.addr);
        endIncentive = await smg.getStoremanIncentive(wk2.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 5000000)

        await timeWaitIncentive(smg, groupId, wk.addr);
        endIncentive = await smg.getStoremanIncentive(wk.addr, parseInt(groupInfo.endTime-1))
        console.log("sk info:", await smg.getStoremanInfo(wk.addr))
        assert.equal(endIncentive, 7500000)

        await timeWaitIncentive(smg, groupId, g.leader);
        endIncentive = await smg.getStoremanIncentive(g.leader, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 2500000)

        endIncentive = await smg.getSmDelegatorInfoIncentive(wk.addr, de1.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 500000)
        endIncentive = await smg.getSmDelegatorInfoIncentive(wk.addr, part1.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 0)
    })
    
})



contract('incentive incentive value check 2', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)
    let de1 = utils.getAddressFromInt(30000)
    let part1 = utils.getAddressFromInt(40000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:250000});
        await toDelegateIn(smg, wk.addr, index=30000,count=5, value=15000)
        await toPartIn(smg, wk.addr,index=40000,count=5)

        let info = await smg.getStoremanInfo(wk.addr);
        console.log("sk info:", info)

        info = await smg.getSmPartnerInfo(wk.addr, part1.addr)
        console.log("partner info:", info)

        info = await smg.getSmDelegatorInfo(wk.addr, de1.addr)
        console.log("delegator info:", info)
    })  

    it('check incentive ', async ()=>{
        let endIncentive;
        await timeWaitIncentive(smg, groupId, wk3.addr);
        endIncentive = await smg.getStoremanIncentive(wk3.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 12500000)

        await timeWaitIncentive(smg, groupId, wk2.addr);
        endIncentive = await smg.getStoremanIncentive(wk2.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 5000000)

        await timeWaitIncentive(smg, groupId, wk.addr);
        endIncentive = await smg.getStoremanIncentive(wk.addr, parseInt(groupInfo.endTime-1))
        console.log("sk info:", await smg.getStoremanInfo(wk.addr))
        assert.equal(endIncentive, 7750000)

        await timeWaitIncentive(smg, groupId, g.leader);
        endIncentive = await smg.getStoremanIncentive(g.leader, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 2500000)

        endIncentive = await smg.getSmDelegatorInfoIncentive(wk.addr, de1.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 450000)
        endIncentive = await smg.getSmDelegatorInfoIncentive(wk.addr, part1.addr, parseInt(groupInfo.endTime-1))
        assert.equal(endIncentive, 0)
    })
    
})



contract.skip('delete sk', async () => {

    let  smg
    let groupId, groupInfo
    let wk = utils.getAddressFromInt(10000)
    let wk2 = utils.getAddressFromInt(10002)
    let wk3 = utils.getAddressFromInt(10003)
    let de1 = utils.getAddressFromInt(30000)
    let part1 = utils.getAddressFromInt(40000)


    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
        groupId = await registerStart(smg, 0, {htlcDuration:20,delegateFee:1000});
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        await stakeInPre(smg, groupId)
    })



    it('stakeIn', async ()=>{
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
        await smg.stakeIn(groupId, wk2.pk, wk2.pk,{value:100000});
        await smg.stakeIn(groupId, wk3.pk, wk3.pk,{value:250000});
        await toDelegateIn(smg, wk.addr, index=30000,count=5, value=15000)
        await toPartIn(smg, wk.addr,index=40000,count=5)
        let smInfo = await smg.getStoremanInfo(wk.addr);
        console.log("stakeIn smInfo:", smInfo)
    })  

    it('check incentive ', async ()=>{
        let endIncentive;
        let tx
        await timeWaitIncentive(smg, groupId, wk.addr);
        endIncentive = await smg.getStoremanIncentive(wk.addr, parseInt(groupInfo.endTime-1))
        console.log("sk info:", await smg.getStoremanInfo(wk.addr))
        assert.equal(endIncentive, 7750000)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.dismissed, {from:g.admin})

        tx = smg.cleanStoremanNode(wk.addr, {from:g.admin})
        await expectRevert(tx, 'using')


        await toDelegateClaim(smg, wk.addr, index=30000,count=5)

        tx = smg.cleanStoremanNode(wk.addr, {from:g.admin})
        await expectRevert(tx, 'using')


        await toPartClaim(smg, wk.addr,index=40000,count=5)
        tx = smg.cleanStoremanNode(wk.addr, {from:g.admin})
        await expectRevert(tx, 'using')

        await smg.stakeClaim(wk.addr);
        let smInfo = await smg.getStoremanInfo(wk.addr);
        console.log("smInfo:", smInfo)
        tx = await smg.cleanStoremanNode(wk.addr, {from:g.admin})
        console.log(" cleanStoremanNode tx:", tx)
    })
    
})

