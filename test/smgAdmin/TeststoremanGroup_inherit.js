const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitSelect, toStakeAppend } = require('../base.js')

contract('StoremanGroupDelegate_inherit', async () => {
 
    let smg
    let groupId
    let groupId2
    let groupInfo,groupInfo2;
    let oldSelected = [];
    let newSelected = [];

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg, 0, {memberCountDesign: 21});
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("rotate groupId: ", groupId)
    })

    it('stakeInPre', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('select', async ()=>{
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
        let count = await smg.getSelectedSmNumber(groupId)
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            oldSelected.push(sk.wkAddr);
            console.log("storeman %d(%s), %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
    })

    it('stakeAppend', async ()=>{
      await toStakeAppend(smg);
      console.log("selected storeman before inherit:");
      let count = await smg.getSelectedSmNumber(groupId)
      for (let i = 0; i<count; i++) {
        let skAddr = await smg.getSelectedSmInfo(groupId, i)
        let sk = await smg.getStoremanInfo(skAddr[0]);
        assert.equal(sk.wkAddr, oldSelected[i]);
        console.log("storeman %d(%s), %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
      }
      assert.equal(count, oldSelected.length);
    })

    it('registerStart2', async ()=>{
        await utils.sleep(1000)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.leader});
        groupId2 = await registerStart(smg, 0, {preGroupId:groupId, memberCountDesign: 21});
        console.log("groupId2: ", groupId2)
        console.log("selected storeman after inherit:");
        let count = await smg.getSelectedSmNumber(groupId2)
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId2, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            if (i == 0) { // whitelist
              assert.equal(sk.wkAddr, oldSelected[i]);
            } else { // revert
              assert.equal(sk.wkAddr, oldSelected[oldSelected.length - i]);
            }
            console.log("storeman %d(%s): %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
        assert.equal(count, oldSelected.length);
    })

    it('group2 select', async ()=>{
        groupInfo2 = await smg.getStoremanGroupInfo(groupId2);
        await timeWaitSelect(groupInfo2);
        await toSelect(smg, groupId2);
        let count = await smg.getSelectedSmNumber(groupId2)
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId2, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("storeman %d(%s): %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        } 
    })
})