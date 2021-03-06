
const utils = require("../utils");

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const assert  = require('assert')




const { setupNetwork, registerStart,g } = require('../base.js')

contract('StoremanGroupDelegate_registerStart', async () => {

    let  smg
    const whiteCountAll = 4;
    const whiteBackup = 3
    const whiteCount = whiteCountAll - whiteBackup;
    const memberCountDesign = 4
    const threshold  = 3
    const stakerCount = memberCountDesign + whiteBackup
    const registerDuration = 5; // open staking for 10 days.
    const gpkDuration = 3;
    const htlcDuration = 9; // work 90 day.
    const timeBase = 1;
    const wanChainId = 2153201998;
    const ethChainId = 2147483708;
    const curve1 = 1, curve2 = 1;
    const minStakeIn = 50000;
    const minDelegateIn = 100;
    const minPartIn = 10000;
    const delegateFee = 1200;
    const whiteAddrOffset = 2000;
    const otherAddrOffset = whiteAddrOffset * 20;
    let wlStartIndex = 0
     
    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('Invalid white list length ', async ()=>{
        let option = {}
        let now = parseInt(Date.now());
        let ws = []
        let srs= []
        for(let i=0; i<whiteCountAll;i++){
            ws.push(g.wks[i+wlStartIndex])
            srs.push(g.sfs[i % g.sfs.length])
        }
        ws.push(g.wks[9])
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(now.toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "Invalid white list length")
    })

    it('Insufficient white list ', async ()=>{
        let option = {}
        let now = parseInt(Date.now());
        let ws = []
        let srs= []
        for(let i=0; i<2;i++){
            ws.push(g.wks[i+wlStartIndex])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(now.toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "Insufficient white list.")
    })

    it('Too many whitelist node ', async ()=>{
        let option = {}
        let now = parseInt(Date.now());
        let ws = []
        let srs= []
        for(let i=0; i<8;i++){
            ws.push(g.wks[i+wlStartIndex])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(now.toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "Too many whitelist node")
    })

    it('invalid preGroup ', async ()=>{
        let option = {}
        let wlStartIndex =0
        let now = parseInt(Date.now());
        let ws = []
        let srs= []
        for(let i=0; i<whiteCountAll;i++){
            ws.push(g.wks[i+wlStartIndex])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let groupId = option.groupId ? option.groupId : utils.stringTobytes32(now.toString());
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("none");
    
        let smgIn = {
            groupId: groupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "invalid preGroup")
    })

    it('invalid preGroup ', async ()=>{

        let oldgroupId = await registerStart(smg, 0, {htlcDuration: 90});
        //console.log("oldgroupId:", oldgroupId)
        let option = {}
        let wlStartIndex =0
        let now = parseInt(Date.now());
        let ws = []
        let srs= []
        for(let i=0; i<whiteCountAll;i++){
            ws.push(g.wks[i+wlStartIndex])
            srs.push(g.sfs[i % g.sfs.length])
        }
        let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
        let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
        let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
        let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
        let threshold = option.threshold ? option.threshold : g.threshold;
        let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    
        let smgIn = {
            groupId: oldgroupId,
            preGroupId: preGroupId,
            workTime:now+(registerDuration+gpkDuration)*g.timeBase,
            totalTime:htlcDuration*g.timeBase,
            registerDuration: registerDuration*g.timeBase,
            memberCountDesign:memberCountDesign,
            threshold:threshold,
            chain1:ethChainId,
            chain2:wanChainId,
            curve1:curve1,
            curve2:curve2,
            minStakeIn:minStakeIn,
            minDelegateIn:minDelegateIn,
            minPartIn:minPartIn,
            delegateFee:delegateFee,
        }
        let tx =  smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
        await expectRevert(tx, "group has existed already")
        let groupInfo = await smg.getStoremanGroupInfo(oldgroupId)
        //console.log("groupInfo:", groupInfo)
    })
})
