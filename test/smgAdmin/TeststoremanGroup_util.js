

const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const FakePosLib = artifacts.require('FakePosLib')
const assert = require('chai').assert;
const StoremanUtil = artifacts.require('StoremanUtil')


const { registerStart, deploySmg,stakeInPre, setupNetwork,g} = require('../base.js')

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/



contract('StoremanGroupDelegate util', async () => {

    let  smg
    let smgUtil
    let pos
    before("init contracts", async() => {
        await setupNetwork();
        console.log("setup newwork finished")
        smg = await deploySmg();
        console.log("deploySmg finished")
        smgUtil =  g.storemanUtil
        pos = g.fakePosLib
    })

    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

    it('getDaybyTime ', async ()=>{
        let time = 1597891837;
        let day = await smgUtil.getDaybyTime(pos.address, time);
        console.log("day is ", day)
    })
    it('calSkWeight ', async ()=>{
        let d = 10000;
        let w = await smgUtil.calSkWeight(15000,d);
        console.log("weight is ", w.toString(10))
        assert.equal(w, 15000, "calSkWeight failed")
    })
    it('getSelectedSmNumber ', async ()=>{
        let w = await smg.getSelectedSmNumber(groupId);
        console.log("getSelectedSmNumber is ", w)
        assert.equal(w, 4, "getSelectedSmNumber failed")
    })

    it('onCurve ', async ()=>{
        let f = await smgUtil.onCurve("0xd9fcbfcd5d977d9b3822b49b1c63750541999a71f6305d255060e1e2fcf816e1b682bd8224ae99fa1b2e965b1825392c26506a1a373cd043928865e384a599");
        assert.equal(f, false, "onCurve failed")
        let w = await smgUtil.onCurve("0x95d9fcbfcd5d977d9b3822b49b1c63750541999a71f6305d255060e1e2fcf816e1b682bd8224ae99fa1b2e965b1825392c26506a1a373cd043928865e384a599");
        assert.equal(w, true, "onCurve failed")
        w = await smgUtil.onCurve("0x95d9fcbfcd5d977d9b3822b49b1c63750541999a71f6305d255060e1e2fcf816e1b682bd8224ae99fa1b2e965b1825392c26506a1a373cd043928865e384a591");
        assert.equal(w, false, "onCurve failed")
        w = await smgUtil.onCurve("0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
        assert.equal(w, false, "onCurve failed")
        w = await smgUtil.onCurve("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
        assert.equal(w, false, "onCurve failed")
        w = await smgUtil.onCurve("0xd9fcbfcd5d977d9b3822b49b1c63750541999a71f6305d255060e1e2fcf816e00000000000000000000000000000000000000000000000000000000000000000");
        assert.equal(w, false, "onCurve failed")
        w = await smgUtil.onCurve("0x95d9fcbfcd5d977d9b3822b49b1c63750541999a71f6305d255060e1e2fcf816FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
        assert.equal(w, false, "onCurve failed")
    })
    
    it('getSelectedStoreman ', async ()=>{
        let w = await smg.getSelectedStoreman(groupId);
        console.log("getSelectedStoreman is ", w)
    })

})
