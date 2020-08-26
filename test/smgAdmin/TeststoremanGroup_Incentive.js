const utils = require("../utils");
const Web3 = require('web3')

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');


let gpk = '0xd32f34db1cf3d028742081db75fb32b16d3e2ed2c0ea868d8c26c529933edbd573de0a0c462ac15411e6ff7b9d2d2123c5321f1c2590852406ae831ca2e016b0';
const {
    registerStart,
    stakeInPre,
    web3url,
    g,
    toSelect,
    setupNetwork,
    initTestValue
} = require('../baseIncentive.js');

const { assert } = require('chai');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const ERROR_INFO = 'it should be throw error';
const ERROR_GROUP_ID = web3.utils.fromAscii("Invalid Group");

const delegatorCounts = 100;
const memberCountDesign = 21;
const threshold = 17;

/*
奖励与时间相关．
假定ｈｔｌｃ工作９０天，　提前１４天开放ｓｔａｋｉｎｇ．　开放１０天．　然后ｓｅｌｅｃｔ，　然后４天用于产生ｇｐｋ．
*/
contract('Test Storeman Group Incentive', async () => {
    let smgInstance;
    let groupId;
    const posIncentive = "0x1c9c380";
    let currAddrOffset = g.otherAddrOffset;
    let wks = {
        loser: utils.getAddressFromInt(++currAddrOffset),
        one: utils.getAddressFromInt(++currAddrOffset),
        many: utils.getAddressFromInt(++currAddrOffset)
    };
    let delegators = {};

    before("init contracts success:", async () => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smgInstance = await StoremanGroupDelegate.at(smgProxy.address);
        initTestValue("memberCountDesign", memberCountDesign);
        initTestValue("threshold", threshold);
        initTestValue("stakerCount", g.memberCountDesign + g.whiteBackup);
        await setupNetwork();
    });

    // TODO:
    it('incentiveCandidator before group register, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(g.leader);
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "forbid incentive");
        }
    });

    it.skip('select storeman before group register, should fail', async () => {
        try {
            await smgInstance.select(ERROR_GROUP_ID,{from: g.leader});
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "forbid select");
        }
    });

    it('select storeman without stakeIn, should fail', async () => {
        let currGroupId = await registerStart(smgInstance, {groupId: ERROR_GROUP_ID});
        console.log("get group id", currGroupId);
        console.log("pad group id", web3.utils.padRight(ERROR_GROUP_ID, 64));
        // assert.equal(currGroupId, web3.utils.padRight(ERROR_GROUP_ID, 64), "check group ID failed");
        // let currGroup = await smgInstance.getStoremanGroupInfo(currGroupId);
        // assert.equal(currGroup.groupId, web3.utils.padRight(ERROR_GROUP_ID, 64), "check the queried group ID failed");

        // try {
        //     await smgInstance.select(currGroupId,{from: g.leader});
        //     assert.fail(ERROR_INFO);
        // } catch (e) {
        //     // console.log(e);
        //     assert.include(e.toString(), "forbid select");
        // }
    });

    it('register storeman group success', async () => {
        groupId = await registerStart(smgInstance);
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
            assert.include(e.toString(), "forbid incentive");
        }
    });

    it('common stakeIn success', async () => {
        await stakeInPre(smgInstance, groupId)
    });

    it('[1] one staker stakeIn with one delegator', async () => {
        let tx = await smgInstance.stakeIn(groupId, wks.one.pk, wks.one.pk,{value:g.minStakeInValue * 2});
        // console.log("tx:", tx);
    });

    it('[2] one staker stakeIn with much more delegator success', async () => {
        let tx = await smgInstance.stakeIn(groupId, wks.many.pk, wks.many.pk,{value:g.minStakeInValue * 2});
        // console.log("tx:", tx);
    });

    it('[3] one stake loser stakeIn with min value success', async () => {
        await smgInstance.stakeIn(groupId, wks.loser.pk, wks.loser.pk,{value:g.minStakeInValue});
    });

    it('[1] delegateIn success', async () => {
        let d = utils.getAddressFromInt(++currAddrOffset);
        await web3.eth.sendTransaction({from: g.owner, to: d.addr, value: g.minDelegateInValue});

        let tx = await smgInstance.delegateIn(wks.one.addr,{value:g.minDelegateInValue});
        assert.equal(tx.receipt.logs[0].event, 'delegateInEvent', "check delegateIn event name failed")
        // console.log("delegator", d.addr, " delegateIn tx:", tx);

        if (!delegators[wks.one.addr]) {
            delegators[wks.one.addr] = [];
        }
        delegators[wks.one.addr].push(d);
    });

    it('[2] delegateIn success', async () => {
        for (let i = 0; i < delegatorCounts; ++i) {
            let d = utils.getAddressFromInt(++currAddrOffset);
            await web3.eth.sendTransaction({from: g.owner, to: d.addr, value: g.minDelegateInValue});

            let tx = await smgInstance.delegateIn(wks.many.addr,{value:g.minDelegateInValue});
            assert.equal(tx.receipt.logs[0].event, 'delegateInEvent', "check delegateIn event name failed")
            // console.log("delegator", d.addr, " delegateIn tx:", tx);

            if (!delegators[wks.many.addr]) {
                delegators[wks.many.addr] = [];
            }
            delegators[wks.many.addr].push(d);
        }
        // console.log("currAddrOffset", currAddrOffset);
    });

    // TODO:
    it('incentiveCandidator before select, should fail', async () => {
        try {
            let incentiveCandidatorReceipt = await smgInstance.incentiveCandidator(g.leader)
            // console.log("incentiveCandidatorReceipt:", incentiveCandidatorReceipt);
            // console.log("incentiveCandidatorReceipt logs:", incentiveCandidatorReceipt.logs);
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "forbid incentive");
        }
    });

    it('select storeman sucess', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        await utils.sleepUntil(1000 * (Number(group.registerTime) + Number(group.registerDuration)));

        let tx = await smgInstance.select(groupId,{from: g.leader});
        // console.log("group %s select tx:", groupId, tx.tx)
        let selectedCount = await smgInstance.getSelectedSmNumber(groupId)
        assert.equal(selectedCount.toNumber(), g.memberCountDesign, "memberCountDesign is not equal");
    });

    it('check toSelect sucess', async () => {
        let selectedCount = await smgInstance.getSelectedSmNumber(groupId);
        selectedCount = selectedCount.toNumber();
        assert.equal(selectedCount, g.memberCountDesign, "memberCountDesign is not equal")

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
            // console.log(e);
            assert.include(e.toString(), "forbid incentive");
        }
    });

    it('setGpk success', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        await utils.sleepUntil(1000 * (Number(group.startTime) + Number(group.registerTime)));
        await smgInstance.updateGroupStatus(groupId, 5);
    });

    // it('reward storeman group success', async () => {
    //     // for (let i = 0; i < g.htlcDuration*g.timeBase; ++i) {
    //         let smgTransferReceipt = await smgInstance.smgTransfer(groupId, {value: g.memberCountDesign * 1000000});
    //         // console.log("smgTransfer", smgTransferReceipt)
    //         // console.log("smgTransfer logs", smgTransferReceipt.logs)
    //         // await utils.sleepUntil(1000);
    //     // }
    // });

    it('incentiveCandidator by wkAddr not selected, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(wks.loser.addr)
            assert.fail(ERROR_INFO);
        } catch (e) {
            // console.log(e);
            assert.include(e.toString(), "not selected");
        }
    });

    it('[1] incentiveCandidator by storeman sucess', async () => {
        let group = await smgInstance.getStoremanGroupInfo(groupId);
        let time = 1000 * (Number(group.startTime) - parseInt(Date.now()/1000) + g.htlcDuration * g.timeBase);
        await utils.sleepUntil(time);
        console.log("incentive until", time, "ms");

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
                    assert.equal(smInc.toNumber(), parseInt(Number(posIncentive)/g.memberCountDesign), "node incentive is wrong")
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

    it.skip('[2] incentive candidator sucess', async () => {
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
        //         assert.equal(smInc, Number(posIncentive)/g.memberCountDesign, "node incentive is wrong")
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
        let count = await smgInstance.getSelectedSmNumber(groupId)
        console.log("count :", count)
        assert.equal(count, g.memberCountDesign, "g.memberCountDesign is not equal")
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
                        assert.equal(skInc, Number(posIncentive)/g.memberCountDesign, "node incentive is wrong")
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
