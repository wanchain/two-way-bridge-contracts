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


let stakerCount = memberCountDesign+whiteBackup
let web3 = new Web3(new Web3.providers.HttpProvider(web3url))



const g = {
    leader,WhiteCount,whiteBackup,memberCountDesign,threshold,leaderPk,owner,web3url,
}

async function registerStart(smg){
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
        srs.push(sr)
    }
    let tx = await smg.storemanGroupRegisterStart(id,now+10, 90, 10,utils.stringTobytes32(""), wks,srs,
        {from: owner})
    console.log("registerStart txhash:", tx.tx)
    await utils.waitReceipt(tx.tx)
    let group = await smg.getStoremanGroupInfo(id)
    assert.equal(group.status, 1)
    assert.equal(group.groupId, id)
    assert.equal(group.deposit, 0)
    assert.equal(group.memberCount, 1)
    console.log("group:", group)
    return group.groupId
}
async function stakeInPre(smg, id){
    console.log("smg.contract:", smg.contract._address)
    for(let i=0; i<stakerCount; i++){
        let sf = utils.getAddressFromInt(i+1000)
        let sw = utils.getAddressFromInt(i+2000)
        let en = utils.getAddressFromInt(i+3000)
        let stakingValue = 2000;
        let sdata =  smg.contract.methods.stakeIn(id, sw.pk,en.pk,666).encodeABI()
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
        //let txhash = await web3.eth.sendSignedTransaction(serializedTx)
        let txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth);
        console.log("txhash i:", i, txhash)
        await utils.waitReceipt(txhash)
        let candidate  = await smg.getStoremanInfo(sw.addr)
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), sf.addr)
        assert.equal(candidate.pkAddress.toLowerCase(), sw.addr)
        assert.equal(candidate.deposit, stakingValue)
    }
}

module.exports = {
    g,
    registerStart,
    stakeInPre,
}