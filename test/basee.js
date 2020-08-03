const utils = require("./utils");
const assert = require('chai').assert;
const pu = require('promisefy-util')
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
const Web3 = require('web3')

const web3url = "http://127.0.0.1:8545"

const owner = "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959"
const leader = "0xdC49B58d1Dc15Ff96719d743552A3d0850dD7057"
const leaderPk = "0xb6ee04e3c64e31578dd746d1024429179d83122fb926be19bd33aaeea55afeb6b10c6ff525eec7ca9a4e9a252a4c74b222c1273d4719d96e0f2c5199c42bc84b"


const WhiteCount = 4
const whiteBackup = 3
const memberCountDesign = 4
const threshold  = 3
let deCount=1;
let gGasLimit=9000000;
let gGasPrice=200000000000;


let stakerCount = memberCountDesign+whiteBackup
let web3 = new Web3(new Web3.providers.HttpProvider(web3url))

const sfs = [
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

const g = {
    leader,WhiteCount,whiteBackup,memberCountDesign,threshold,leaderPk,owner,web3url,stakerCount,sfs,
}

async function registerStart(smg){
    await smg.updateStoremanConf(3,1500,10)
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    let wks = []
    let srs= []
    // wks.push(leader)
    // srs.push(leader)
    for(let i=0; i<WhiteCount;i++){
        let {addr:sr} = utils.getAddressFromInt(i+1000)
        let {addr:wk} = utils.getAddressFromInt(i+2000)
        wks.push(wk)
        srs.push(sfs[i])
    }
    let tx = await smg.storemanGroupRegisterStart(id,now+10, 900, 100,utils.stringTobytes32(""), wks,srs,
        {from: owner})
    console.log("registerStart txhash:", tx.tx)
    //await utils.waitReceipt(web3, tx.tx)
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
        console.log("selected node %d: %O", i, skAddr);
        let sk = await smg.getStoremanInfo(skAddr[0]);
        console.log("storeman %d info: %O", i, sk);
    }    
}
module.exports = {
    g,
    registerStart,
    stakeInPre,toSelect,
}
