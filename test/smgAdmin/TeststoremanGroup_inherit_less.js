const utils = require("../utils");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const { registerStart,stakeInPre, g, toSelect,setupNetwork, timeWaitSelect, toStakeAppend } = require('../base.js')

contract('StoremanGroupDelegate_inherit', async () => {
 
    let smg;
    let groupId, groupId2;
    let groupInfo,groupInfo2;
    let stakes = [];

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })

    it('registerStart1', async ()=>{
        let result = await registerStart(smg, 0, {memberCountDesign: 7, getTx: true});
        groupId = result.groupId;
        groupInfo = await smg.getStoremanGroupInfo(groupId);
        console.log("groupId1: ", groupId)
        let transferEvent = result.tx.receipt.logs[2].args;
        assert.equal(transferEvent.groupId, groupId);
        assert.equal(transferEvent.preGroupId == 0, true);
        assert.equal(transferEvent.wkAddrs.length, 0);
    })

    it('stakeInPre1', async ()=>{
        stakes = await stakeInPre(smg, groupId, 0, 10);
    })

    it('select1', async ()=>{
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
        let count = await smg.getSelectedSmNumber(groupId)
        assert.equal(count, 7);
        for (let i = 0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            if (i == 0) {
              assert.equal(sk.wkAddr.toLowerCase(), stakes[i]);
            } else {
              assert.equal(sk.wkAddr.toLowerCase(), stakes[i + 3]);
            }
            console.log("group1 storeman %d(%s), %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
    })

    it('stakeAppend1', async ()=>{
        await toStakeAppend(smg, true, 7, 3);
        console.log("group1 selected storeman after append:");
        let count = await smg.getSelectedSmNumber(groupId);
        assert.equal(count, 7);
        for (let i = 0; i<count; i++) {
          let skAddr = await smg.getSelectedSmInfo(groupId, i)
          let sk = await smg.getStoremanInfo(skAddr[0]);
          if (i == 0) {
            assert.equal(sk.wkAddr.toLowerCase(), stakes[i]);
          } else {
            assert.equal(sk.wkAddr.toLowerCase(), stakes[i + 3]);
          }
        }      
    })

    it('registerStart2', async ()=>{
        await utils.sleep(1000)
        await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.leader});
        let result = await registerStart(smg, 0, {preGroupId:groupId, memberCountDesign: 4, getTx: true});
        groupId2 = result.groupId;
        console.log("groupId2: ", groupId2)
        console.log("group2 selected storeman from inherit group1:");
        let count = await smg.getSelectedSmNumber(groupId2);
        assert.equal(count, 4);
        for (let i = 0; i < count; i++) {
          let skAddr = await smg.getSelectedSmInfo(groupId2, i)
          let sk = await smg.getStoremanInfo(skAddr[0]);
          assert.equal(sk.nextGroupId, groupId2);
          if (i == 0) { // whitelist
            assert.equal(sk.wkAddr.toLowerCase(), stakes[i]);
          } else { // revert
            assert.equal(sk.wkAddr.toLowerCase(), stakes[10 - i]);
          }
          console.log("group2 storeman %d(%s): %s, %s, %s", i, sk.wkAddr, sk.deposit, sk.groupId, sk.nextGroupId);
        }
        let transferEvent = result.tx.receipt.logs[2].args;
        assert.equal(transferEvent.groupId, groupId2);
        assert.equal(transferEvent.preGroupId, groupId);
        assert.equal(transferEvent.wkAddrs.length, 10);
        for (let i = 0; i < transferEvent.wkAddrs.length; i++) {
          let sk = await smg.getStoremanInfo(transferEvent.wkAddrs[i]);
          if ((i >= 1) && (i <= 3)) { // backup whitelist
            assert.equal(sk.nextGroupId == 0, true);
          } else {
            assert.equal(sk.nextGroupId, groupId2);
          }          
        }         
    })  
})