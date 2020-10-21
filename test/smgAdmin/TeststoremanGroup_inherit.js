const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitSelect, toStakeAppend } = require('../base.js')

contract('StoremanGroupDelegate_inherit', async () => {
 
    let smg;
    let groupId, groupId2;
    let groupInfo,groupInfo2;
    let oldSelected = [];

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })

    it('registerStart1', async ()=>{
        groupId = await registerStart(smg, 0, {memberCountDesign: 4});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("groupId1: ", groupId)
    })

    it('stakeInPre1', async ()=>{
        await stakeInPre(smg, groupId, 0, 7);
    })

    it('select1', async ()=>{
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
        let count = await smg.getSelectedSmNumber(groupId)
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            oldSelected.push(sk.wkAddr);
            console.log("group1 storeman %d(%s), %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
    })

    it('stakeAppend1', async ()=>{
        await toStakeAppend(smg, true, 4, 3);
        console.log("group1 selected storeman after append:");
        let count = await smg.getSelectedSmNumber(groupId);
        assert.equal(count, oldSelected.length);
        for (let i = 0; i<count; i++) {
          let skAddr = await smg.getSelectedSmInfo(groupId, i)
          let sk = await smg.getStoremanInfo(skAddr[0]);
          assert.equal(sk.wkAddr, oldSelected[i]);
        }      
    })

    it('registerStart2', async ()=>{
        await utils.sleep(1000)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.leader});
        groupId2 = await registerStart(smg, 0, {preGroupId:groupId, memberCountDesign: 7});
        console.log("groupId2: ", groupId2)
        console.log("group2 selected storeman from inherit group1:");
        let count = await smg.getSelectedSmNumber(groupId2);
        assert.equal(count, oldSelected.length);
        for (let i = 0; i < count; i++) {
          let skAddr = await smg.getSelectedSmInfo(groupId2, i)
          let sk = await smg.getStoremanInfo(skAddr[0]);
          if (i == 0) { // whitelist
            assert.equal(sk.wkAddr, oldSelected[i]);
          } else { // revert
            assert.equal(sk.wkAddr, oldSelected[oldSelected.length - i]);
          }
          console.log("group2 storeman %d(%s): %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
    })

    it('group2 select', async ()=>{
        await stakeInPre(smg, groupId2, 8, 3);
        await toStakeAppend(smg, true, 8, 3, 4);      
        groupInfo2 = await smg.getStoremanGroupInfo(groupId2);
        await timeWaitSelect(groupInfo2);
        await toSelect(smg, groupId2);
        console.log("group2 selected storeman after new staker:");
        let count = await smg.getSelectedSmNumber(groupId2);
        assert.equal(count, 7);
        for (let i = 0; i < count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId2, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            if (i == 0) { // whitelist
              assert.equal(sk.wkAddr, oldSelected[i]);
            } else if (i > 4) { // revert
              assert.equal(sk.wkAddr, oldSelected[oldSelected.length - (i - 4) - 1]);
            }
            console.log("group2 storeman %d(%s): %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
    })
})