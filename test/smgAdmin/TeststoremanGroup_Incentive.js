const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const {
    registerStart,
    stakeWhiteList,
    g,
    toSelect,
    setupNetwork,
    initTestValue
} = require('../base.js');

const { assert } = require('chai');

const ERROR_INFO = 'it should be throw error';
const ERROR_GROUP_ID_1 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 1"), 64);
const ERROR_GROUP_ID_2 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 2"), 64);
const ERROR_GROUP_ID_3 = web3.utils.padRight(web3.utils.fromAscii("Invalid Group 3"), 64);

const delegatorCounts = 100;
const memberCountDesign = 21;
const threshold = 17;
// let leftStakeCount = memberCountDesign + g.whiteCountAll;
let leftStakeCount = memberCountDesign;

/*
奖励与时间相关．
假定ｈｔｌｃ工作９０天，　提前１４天开放ｓｔａｋｉｎｇ．　开放１０天．　然后ｓｅｌｅｃｔ，　然后４天用于产生ｇｐｋ．
*/
contract('Test Storeman Group Incentive', async (accounts) => {
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
        let currGroupId = await registerStart(smgInstance, whiteStakeAddrOffset, {
            groupId: ERROR_GROUP_ID_1,
            memberCountDesign: memberCountDesign,
            registerDuration: g.registerDuration * 10,
            threshold: threshold
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
            memberCountDesign: memberCountDesign,
            registerDuration: g.registerDuration,
            threshold: threshold
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
            memberCountDesign: memberCountDesign,
            registerDuration: g.registerDuration * 10,
            threshold: threshold
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

    it('incentiveCandidator by wkAddr not selected, should fail', async () => {
        try {
            await smgInstance.incentiveCandidator(wks.loser.addr)
            assert.fail(ERROR_INFO);
        } catch (e) {
            assert.include(e.toString(), "not selected");
        }
    });

    it('[one-delegator] incentiveCandidator by storeman sucess', async () => {
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

    it('[multi-delegator] incentive candidator sucess', async () => {
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

    it('total incentive candidator sucess', async () => {
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
