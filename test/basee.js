const utils = require("./utils");
const assert = require('chai').assert;
const pu = require('promisefy-util')
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
const Web3 = require('web3')

let web3url, owner, leader, leaderPk, sfs;


let useLocal = true;
if(useLocal){
    web3url = "http://127.0.0.1:8545"
    owner = "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959"
    leader = "0xdC49B58d1Dc15Ff96719d743552A3d0850dD7057"
    leaderPk = "0xb6ee04e3c64e31578dd746d1024429179d83122fb926be19bd33aaeea55afeb6b10c6ff525eec7ca9a4e9a252a4c74b222c1273d4719d96e0f2c5199c42bc84b"
    sfs = [
        "0xdc49b58d1dc15ff96719d743552a3d0850dd7057", 
        "0xfaeB08EF75458BbC511Bca1CAf4d7f5DF08EA834", 
        "0x5AA169d911f99b8CefebE7E39c7276533af84BC2", 
        "0x21965990CaA1046C93eC17f0545464Ab938eef31", 
        "0x998E09775147E880c3A70b68c91B5b13a3b65FDe", 
        "0xcaa937e534E1CC1e465ce434E61Ef6833C77f45B", 
        "0xF7c464575C20602FA53faf815f5e7ccAd646f03E", 
        "0xbf59C743A13cff1fF5280B7AfD94fB10A626aF6D", 
        "0xe1517f2C9ad21a3826cFA791F78e8AcBDFFFA804", 
    ]
}else{
    web3url = "http://192.168.1.58:7654"
    owner = "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e"
    leader = "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606"
    leaderPk = "0x25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8"
}



const WhiteCount = 4
const whiteBackup = 3
const memberCountDesign = 4
const threshold  = 3
let deCount=1;
let gGasLimit=9000000;
let gGasPrice=200000000000;

let epochDuring = 120;

let stakerCount = memberCountDesign+whiteBackup
let web3 = new Web3(new Web3.providers.HttpProvider(web3url))



const inAdvance = 6; // try to open the group in advance 14 day HTLC work time.
const registerDuration = 3; // open staking for 10 days.
const htlcDuration = 9; // work 90 day.
const timeBase = 10; // how many seconds as 1 day.
const g = {
    leader,WhiteCount,whiteBackup,memberCountDesign,threshold,leaderPk,owner,web3url,stakerCount,sfs,
    inAdvance, registerDuration, htlcDuration,timeBase,
}

async function registerStart(smg){
    await smg.updateStoremanConf(3,15000,10)
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    let wks = []
    let srs= []
    for(let i=0; i<WhiteCount;i++){
        let {addr:wk} = utils.getAddressFromInt(i+2000)
        wks.push(wk)
        srs.push(sfs[i])
    }
    let tx = await smg.storemanGroupRegisterStart(id,now+inAdvance*timeBase, htlcDuration*timeBase, registerDuration*timeBase,utils.stringTobytes32(""), wks,srs,
        {from: owner})
    console.log("registerStart txhash:", tx.tx)
    let group = await smg.getStoremanGroupInfo(id)
    assert.equal(group.status, 1)
    assert.equal(group.groupId, id)
    assert.equal(group.deposit, 0)
    assert.equal(group.memberCount, 1)
    console.log("group:", group)
    let curve1 = 0, curve2 = 1;
    await smg.updateGroupChain(id, 0, 1, curve1, curve2);
    console.log("group curves: [%d, %d]", curve1, curve2);
    await smg.updateGroupConfig(id, 4, 3, 1, 100);
    return group.groupId
}

async function registerStart2(smg, preGroupId=utils.stringTobytes32(""),wks,srs){
    await smg.updateStoremanConf(3,15000,10)
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    let tx = await smg.storemanGroupRegisterStart(id,now+inAdvance*timeBase, htlcDuration*timeBase, registerDuration*timeBase,preGroupId, wks,srs,
        {from: owner})
    console.log("registerStart txhash:", tx.tx)
    let group = await smg.getStoremanGroupInfo(id)
    assert.equal(group.status, 1)
    assert.equal(group.groupId, id)
    if(!preGroupId) {
        assert.equal(group.deposit, 0)
        assert.equal(group.memberCount, 1)
    }

    //console.log("group:", group)
    let curve1 = 0, curve2 = 1;
    await smg.updateGroupChain(id, 0, 1, curve1, curve2);
    console.log("group curves: [%d, %d]", curve1, curve2);
    await smg.updateGroupConfig(id, 4, 3, 1, 100);
    return group.groupId
}


async function stakeInPre(smg, id){
    console.log("smg.contract:", smg.contract._address)
    let stakingValue = 50000
    for(let i=0; i<stakerCount; i++){
        let sw = utils.getAddressFromInt(i+2000)
        let tx = await smg.stakeIn(id, sw.pk, sw.pk,{from:sfs[i], value:stakingValue})
        console.log("preE:", i, tx.tx);
        let candidate  = await smg.getStoremanInfo(sw.addr)
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), sfs[i].toLowerCase())
        assert.equal(candidate.pkAddress.toLowerCase(), sw.addr.toLowerCase())
        assert.equal(candidate.deposit, stakingValue)
    }
}

async function toSelect(smg, groupId){
    let tx = await smg.select(groupId,{from: leader})
    console.log("group %s select tx:", groupId, tx.tx)
    let count = await smg.getSelectedSmNumber(groupId)
    console.log("slected sm number: %d", count);  
    for (let i = 0; i<count; i++) {
        let skAddr = await smg.getSelectedSmInfo(groupId, i)
        //console.log("selected node %d: %O", i, skAddr);
        let sk = await smg.getStoremanInfo(skAddr[0]);
        //console.log("storeman %d info: %O", i, sk);
    }    
}
module.exports = {
    g,
    registerStart,registerStart2,
    stakeInPre,toSelect,
}
