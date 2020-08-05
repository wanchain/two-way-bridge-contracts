const utils = require("./utils");
const assert = require('chai').assert;
const pu = require('promisefy-util')
const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
const Web3 = require('web3')

const web3url = "http://192.168.1.58:7654"
const owner = "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e"
const leader = "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606"
const leaderPk = "0x25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8"
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

const g = {
    leader,WhiteCount,whiteBackup,memberCountDesign,threshold,leaderPk,owner,web3url,
}

async function registerStart(smg, inheritGroupId = ''){
    await smg.updateStoremanConf(3,1500,10)
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    let wks = []
    let srs= []
    // wks.push(leader)
    // srs.push(leader)
    let preGroupId = inheritGroupId || utils.stringTobytes32("");
    if (inheritGroupId) {
        preGroupId = inheritGroupId;
    } else {
        preGroupId = utils.stringTobytes32("");
        for (let i=0; i<WhiteCount;i++) {
          let {addr:sr} = utils.getAddressFromInt(i+1000)
          let {addr:wk} = utils.getAddressFromInt(i+2000)
          wks.push(wk)
          srs.push(sr)
        }
    }
    let tx = await smg.storemanGroupRegisterStart(id, now+10, 60 * 15, 60, preGroupId, wks,srs, {from: owner})
    console.log("registerStart txhash:", tx.tx)
    //await utils.waitReceipt(web3, tx.tx)
    let group = await smg.getStoremanGroupInfo(id)
    assert.equal(group.status, 1)
    assert.equal(group.groupId, id)
    assert.equal(group.deposit, 0)
    assert.isTrue(group.memberCount >= 1)
    console.log("group:", group)
    let curve1 = 0, curve2 = 1;
    await smg.updateGroupChain(id, 0, 1, curve1, curve2);
    console.log("group curves: [%d, %d]", curve1, curve2);
    await smg.updateGroupConfig(id, 4, 3, 1, 100);
    return group.groupId
}

async function stakeInPre(smg, id){
    console.log("smg.contract:", smg.contract._address)
    for(let i=0; i<stakerCount; i++){
        let sf = utils.getAddressFromInt(i+1000)
        let sw = utils.getAddressFromInt(i+2000)
        let en = utils.getAddressFromInt(i+3000)
        let stakingValue = 2000;
        let sdata =  smg.contract.methods.stakeIn(id, sw.pk,en.pk).encodeABI()
        //console.log("sdata:",sdata)
        let rawTx = {
            Txtype: 0x01,
            nonce:  await pu.promisefy(web3.eth.getTransactionCount,[sf.addr,"pending"], web3.eth),
            gasPrice: gGasPrice,
            gas: gGasLimit,
            to: smg.contract._address,
            chainId: 6,
            value: 2000,
            data: sdata,
        }
        //console.log("rawTx:", rawTx)
        let tx = new Tx(rawTx)
        tx.sign(sf.priv)
        const serializedTx = '0x'+tx.serialize().toString('hex');
        //console.log("serializedTx:",serializedTx)
        console.log("sm %d %s stakein", i, sw.addr)
        let rtx = await web3.eth.sendSignedTransaction(serializedTx)
        let txhash = rtx.transactionHash
        //let txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth);
        // await utils.waitReceipt(txhash)
        let candidate  = await smg.getStoremanInfo(sw.addr)
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), sf.addr)
        assert.equal(candidate.pkAddress.toLowerCase(), sw.addr)
        assert.equal(candidate.deposit, stakingValue)
    }
}

async function stakeInPreE(smg, id){
    console.log("smg.contract:", smg.contract._address)
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
    for(let i=0; i<stakerCount; i++){
        let sw = utils.getAddressFromInt(i+2000)
        let tx = await smg.stakeIn(id, sw.pk, sw.pk,{from:sfs[i], value:50000})
        console.log("preE:", tx);
        let candidate  = await smg.getStoremanInfo(sw.addr)
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), sf.addr)
        assert.equal(candidate.pkAddress.toLowerCase(), sw.addr)
        assert.equal(candidate.deposit, stakingValue)
    }
}

async function stakeInOne(smg, groupId, nodeIndex, value){
    console.log("smg.contract:", smg.contract._address)
    let sf = utils.getAddressFromInt(nodeIndex+1000)
    let sw = utils.getAddressFromInt(nodeIndex+2000)
    let en = utils.getAddressFromInt(nodeIndex+3000)
    let sdata =  smg.contract.methods.stakeIn(groupId, sw.pk,en.pk).encodeABI()
    //console.log("sdata:",sdata)
    let rawTx = {
        Txtype: 0x01,
        nonce:  await pu.promisefy(web3.eth.getTransactionCount,[sf.addr,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gas: gGasLimit,
        to: smg.contract._address,
        chainId: 6,
        value: value,
        data: sdata,
    }
    //console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(sf.priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    //console.log("serializedTx:",serializedTx)
    console.log("sm %d %s stakein %d", nodeIndex, sw.addr, value)
    await web3.eth.sendSignedTransaction(serializedTx)
    let candidate  = await smg.getStoremanInfo(sw.addr)
    //console.log("candidate:", candidate)
    assert.equal(candidate.sender.toLowerCase(), sf.addr)
    assert.equal(candidate.pkAddress.toLowerCase(), sw.addr)
    assert.equal(candidate.deposit, value)
    return sw.addr
}

async function toSelect(smg, groupId){
    let tx = await smg.select(groupId,{from: g.leader})
    console.log("group %s select tx:", groupId, tx.tx)
    // await utils.waitReceipt(tx.tx)
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
    stakeInPre,
    stakeInPreE,
    stakeInOne,
    toSelect
}
