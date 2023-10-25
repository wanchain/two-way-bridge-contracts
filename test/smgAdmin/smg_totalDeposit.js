const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const ListGroup = artifacts.require('ListGroup');
const FakePosLib = artifacts.require('FakePosLib');

const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { registerStart,stakeInPre, timeWaitIncentive,setupNetwork, g,timeWaitSelect,toSelect ,deploySmg} = require('../base.js');



contract('TestSmg', async () => {

  let  smg, pos
  let groupId, groupInfo, groupId2
  let contValue = 123456;
  let wk1 = utils.getAddressFromInt(100001)
  let wk2 = utils.getAddressFromInt(100002)


    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg,0,{memberCountDesign:2});
        await utils.sleep(4000);
        groupId2 = await registerStart(smg,0,{memberCountDesign:2});
    })

    it('stakeInPre ', async ()=>{
      await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:80000});
      await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:80000});
    })

    it('add,clean', async ()=>{
      groupInfo = await smg.getStoremanGroupInfo(groupId);
      let cur = parseInt(groupInfo.startTime)
      let tx = smg.connect(g.signerOwner).addActiveGroupId(groupId, {from:g.owner});
      await expectRevert(tx, "not admin")
      tx = g.listGroup.connect(g.signerOwner).addActiveGroup(groupId,0,0, {from:g.owner});
      await expectRevert(tx, "not allow")
      await smg.connect(g.signerAdmin).addActiveGroupId(groupId,  {from:g.admin});
      tx = smg.connect(g.signerAdmin).addActiveGroupId(groupId,  {from:g.admin});
      await expectRevert(tx, "existed")
      let as = await smg.getActiveGroupIds(cur+2);
      assert.equal(as.length, 1)
      console.log("cur:", cur)
      console.log("-------------------as:", as)
      gs = await g.listGroup.getGroups()
      console.log("-------------------gs:", gs)

      await smg.connect(g.signerAdmin).addActiveGroupId(groupId2,  {from:g.admin});
      as = await smg.getActiveGroupIds(cur+8);
      assert.equal(as.length, 2)
      assert.equal(as[0], groupId2)
      assert.equal(as[1], groupId)
      as = await smg.getActiveGroupIds(cur+12);
      assert.equal(as.length, 1)
      assert.equal(as[0], groupId2)
      gs = await g.listGroup.getGroups()
      assert.equal(gs.length, 2)
      await utils.sleepUntil(1000+1000*parseInt(groupInfo.endTime))
      await g.listGroup.cleanExpiredGroup()
      gs = await g.listGroup.getGroups()
      console.log("gs,cur:", gs, parseInt(Date.now()/1000))
      assert.equal(gs.length, 1)
    })

})




contract('TestSmg', async () => {

  let  smg, pos
  let groupId, groupInfo, groupId2
  let contValue = 123456;
  let wk1 = utils.getAddressFromInt(100001)
  let wk2 = utils.getAddressFromInt(100002)
  let listGroup;

  before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")

      listGroup = g.listGroup
      pos = g.fakePosLib
  })


  it('registerStart_1 ', async ()=>{
      groupId = await registerStart(smg,0,{memberCountDesign:2});
      await utils.sleep(1000);
      groupId2 = await registerStart(smg,0,{memberCountDesign:2});
  })

  it('stakeInPre ', async ()=>{
    await smg.stakeIn(groupId, wk1.pk, wk1.pk,{value:80000});
    await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:80000});
  })
  it('pos', async ()=>{
    let ret;
    ret = await pos.getMinIncentive(4, 0, 10000);
    console.log("ret:", ret)
    ret = await pos.getMinIncentive(5, 0, 10000);
    console.log("ret:", ret)
    ret = await pos.getMinIncentive(6, 0, 10000);
    console.log("ret:", ret)
  })


  it('T7 setGpk', async ()=>{

    await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,pos.address);
    let tx = smg.setGpk(groupId, g.leader, g.leader, {from:g.admin});
    await expectRevert(tx, "invalid status")
    groupInfo = await smg.getStoremanGroupInfo(groupId);
    groupInfo2 = await smg.getStoremanGroupInfo(groupId2);

    await timeWaitSelect(groupInfo);
    await timeWaitSelect(groupInfo2);
    await toSelect(smg, groupId);
    await toSelect(smg, groupId2);
    await smg.setGpk(groupId, g.leader, g.leader, {from:g.admin});
    await smg.setGpk(groupId2, g.leader, g.leader, {from:g.admin});


    //
    let all = await listGroup.getGroups()
    console.log("groupIds all:", all)

    let groupIds = await smg.getActiveGroupIds(parseInt(groupInfo.startTime))
    console.log("groupIds:", groupIds)

    let groupIds2 = await smg.getActiveGroupIds(parseInt(groupInfo.endTime)-1)
    console.log("groupIds:", groupIds2)

    let groupIds3 = await smg.getActiveGroupIds(parseInt(groupInfo.endTime))
    console.log("groupIds:", groupIds3)

    await utils.sleepUntil(parseInt(groupInfo.endTime)*1000+1000);
    await listGroup.cleanExpiredGroup();
    let all2 = await listGroup.getGroups()
    console.log("groupIds all:", all2)

    await utils.sleepUntil(parseInt(groupInfo2.endTime)*1000+1000);
    await listGroup.cleanExpiredGroup();
    let all3 = await listGroup.getGroups()
    console.log("groupIds all:", all3)
  })

})



contract('many group', async () => {

  let  smg, listGroup

  const groupNumber = 9;
  let groupIds = [];
  let wk0 = utils.getAddressFromInt(80000)

  before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")
      listGroup = g.listGroup

      for(let i=0; i<groupNumber; i++){
        let wk = utils.getAddressFromInt(80000+i)
        let groupId = await registerStart(smg, 0, {htlcDuration:100,memberCountDesign:2});
        groupIds.push(groupId)
        await smg.stakeIn(groupId, wk.pk, wk.pk,{value:100000});
      }
      let groupInfo = await smg.getStoremanGroupInfo(groupIds[groupNumber-1])
      await timeWaitSelect(groupInfo)
      let dep = await smg.getDependence();
      await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
      for(let i=0; i<groupNumber; i++){
        await toSelect(smg, groupIds[i]);
        let tx = await smg.connect(g.signerAdmin).setGpk(groupIds[i], g.leaderPk, g.leaderPk)
        if(i == groupNumber-1){
          console.log("setgpk gas:", tx)
        }
      }
      await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
  })

  it('check incentive ', async ()=>{
      await timeWaitIncentive(smg, groupIds[0], wk0.addr);
      ginfo = await smg.getStoremanGroupInfo(groupIds[0]);
      //console.log("groupIds[0]:", ginfo)


          let dt = await listGroup.getTotalDeposit(parseInt(ginfo.endTime)-1) 
          console.log("dt i:", parseInt(ginfo.endTime)-1, dt)
          let tx = listGroup.connect(g.signerLeader).setTotalDeposit(parseInt(ginfo.endTime)-1, 100)
          await expectRevert(tx, "not allow")
          let activeGroup = await smg.getActiveGroupIds(parseInt(ginfo.endTime)-1)
          console.log("activeGroup:", parseInt(ginfo.endTime)-1, activeGroup.length)
      
      // console.log("groups:", await listGroup.getGroups().length)
      // await smg.connect(g.signerAdmin).storemanGroupUnregister(groupIds[0]);
      // console.log("groups:", await listGroup.getGroups().length)

  })
  
})


contract('group totalDeposit', async () => {

  let  smg, listGroup

  const groupNumber = 3;
  let groupId0, groupId1, groupId2
  let groupInfo0, groupInfo1, groupInfo2
  let wk0 = utils.getAddressFromInt(80000)
  let wk1 = utils.getAddressFromInt(80001)
  let wk2 = utils.getAddressFromInt(80002)

  before("init contracts", async() => {
      await setupNetwork();
      console.log("setup newwork finished")
      smg = await deploySmg();
      console.log("deploySmg finished")
      listGroup = g.listGroup
        let cur = parseInt(Date.now()/1000)
        groupId0 = await registerStart(smg, 0, {startTIme:cur+6, htlcDuration:20,memberCountDesign:2});
        groupId1 = await registerStart(smg, 0, {startTIme:cur+6, htlcDuration:30,memberCountDesign:2});
        groupId2 = await registerStart(smg, 0, {startTIme:cur+6, htlcDuration:40,memberCountDesign:2});

        await smg.stakeIn(groupId0, wk0.pk, wk0.pk,{value:100000});
        await smg.stakeIn(groupId1, wk1.pk, wk1.pk,{value:100000});
        await smg.stakeIn(groupId2, wk2.pk, wk2.pk,{value:100000});

      let dep = await smg.getDependence();
      await smg.connect(g.signerOwner).setDependence(g.admin, g.admin, g.admin,dep[3]);
      await toSelect(smg, groupId0);
      await toSelect(smg, groupId1);
      await toSelect(smg, groupId2);
      await smg.setGpk(groupId0, g.leaderPk, g.leaderPk, {from:g.admin})
      await smg.setGpk(groupId1, g.leaderPk, g.leaderPk, {from:g.admin})
      await smg.setGpk(groupId2, g.leaderPk, g.leaderPk, {from:g.admin})
      await smg.connect(g.signerOwner).setDependence(dep[0], dep[1], dep[2], dep[3]);
  })

  it('check incentive ', async ()=>{
      await timeWaitIncentive(smg, groupId0, wk0.addr);
      await timeWaitIncentive(smg, groupId1, wk1.addr);
      await timeWaitIncentive(smg, groupId2, wk2.addr);
      groupInfo0 = await smg.getStoremanGroupInfo(groupId0);
      groupInfo1 = await smg.getStoremanGroupInfo(groupId1);
      groupInfo2 = await smg.getStoremanGroupInfo(groupId2);

      let start = parseInt(groupInfo0.startTime)
      let end = parseInt(groupInfo2.endTime)

      for(let i=start; i<=end; i++){
        let dt = await listGroup.getTotalDeposit(i) 
        let ag = await smg.getActiveGroupIds(i);
        if(i-start<20){
          assert.equal(ag.length,3)
          assert.equal(dt.toString(10), "300000")
        }else if(i-start<30){
          assert.equal(ag.length,2)
          assert.equal(dt.toString(10), "200000")
        }else if(i-start<40){
          assert.equal(ag.length,1)
          assert.equal(dt.toString(10), "100000")
        }else{
          assert.equal(ag.length,0)
          assert.equal(dt.toString(10), 0)
        }
        console.log("dt i:", i, dt)
        console.log("ag, i:", i, ag)
      }
  })
  
})



