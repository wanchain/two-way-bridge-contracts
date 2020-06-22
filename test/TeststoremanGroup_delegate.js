const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')
const schnorr = require('../utils/schnorr/tools.js');
const assert = require('chai').assert;
const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const HTLCProxy = artifacts.require('HTLCProxy');
const HTLCDelegate = artifacts.require('HTLCDelegate');
const CreateGpkProxy = artifacts.require('CreateGpkProxy');
const PreCompile = artifacts.require('Enhancement');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
let contractAddress //=   "0x4553061E7aD83d83F559487B1EB7847a9F90ad59"; //   

//let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))
//let web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
let gGasLimit=9000000;
let gGasPrice=200000000000;
let stakingValue = 2000;

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/



let EOS = utils.stringTobytes("EOS")

async function sendRawTransaction(from, priv, data, value) {
    let rawTx = {
        Txtype: 0x01,
        nonce: await pu.promisefy(web3.eth.getTransactionCount,[from,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gasLimit: gGasLimit,
        to: contractAddress,
        chainId: 6,
        value: value,
        data: data,
    }
    //console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
    return txhash;
}

async function tryAddDelegator(smg,  skAddr, de, value)  {
    let dedata = smg.contract.methods.delegateIn(skAddr).encodeABI()
    let rawTx = {
        Txtype: 0x01,
        nonce: await pu.promisefy(web3.eth.getTransactionCount,[de.addr,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gasLimit: gGasLimit,
        to: contractAddress,
        chainId: 6,
        value: value,
        data: dedata,
    }
    //console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(de.priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
    return txhash;
}

async function tryStakeAppend(smg,  sk, wkAddr, value)  {
    let dedata = smg.contract.methods.stakeAppend(wkAddr).encodeABI()
    let rawTx = {
        Txtype: 0x01,
        nonce: await pu.promisefy(web3.eth.getTransactionCount,[sk.addr,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gasLimit: gGasLimit,
        to: contractAddress,
        chainId: 6,
        value: value,
        data: dedata,
    }
    //console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(sk.priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
    return txhash;
}


contract('TestSmg', async (accounts) => {
    let tester = accounts[0].toLowerCase()
    let wPK = "0x4ad3d9fe84de2cb5a7ac496d902e05a9ce63a338c541c742800d892ccc82b03c6caaed191be6dd1c9d633ee3f7c8ac1cc64cd8d8895940dbd927cd3eb4e30336"
    let wAddr = "0x84f2742a958e49e4f976793de111c2cee733f47a"

    let wAddr2 = "0x1fd1f74ba6be9538e1f1d1581fe206058e1090bb"
    let wPK2 = "0x23bdcd1b58db079df94517a52fcfb5bd76efe0106074bffd97d5036700085d23d264b08f06aeaa604df8ecd3ed81e901c4baa2e61799a4f3e9673fcc3887bd1a"
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    //let id = "0x0000000000000000000000000000000000000031353930303435363333303733"

    let deCount=1;

    const WhiteCount = 4
    const whiteBackup = 3
    const memberCountDesign = 4
    const threshold  = 3
    let stakerCount = memberCountDesign+whiteBackup

    let  smg

    before("init contracts", async() => {
        if(!contractAddress) {
            let smgProxy = await StoremanGroupProxy.deployed();
            smg = await StoremanGroupDelegate.at(smgProxy.address)
            contractAddress = smgProxy.address
            console.log("==============================storemanGroup smgProxy contractAddress: ", contractAddress)
        }

        let gpkProxy = await CreateGpkProxy.deployed();
        console.log("CreateGpk contractAddress: %s", gpkProxy.address);

        let preCompile = await PreCompile.deployed();
        console.log("PreCompile contractAddress: %s", preCompile.address);
    
        let tmProxy = await TokenManagerProxy.deployed();
        let tm = await TokenManagerDelegate.at(tmProxy.address);

        await tm.addToken(EOS, 10000,'0x99999999',60 * 60 * 72,EOS,EOS,8)
        let t = await tm.getTokenInfo(EOS)
        console.log("tokens:", t)
    })


    it('registerStart_1 ', async ()=>{
        let wks = []
        let srs= []
        for(let i=0; i<WhiteCount;i++){
            let {addr:sr} = utils.getAddressFromInt(i+1000)
            let {addr:wk} = utils.getAddressFromInt(i+2000)
            wks.push(wk)
            srs.push(sr)
        }
        
        let tx = await smg.registerStart(id,now+10, 90, 10,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("registerStart txhash:", tx.tx)
        await utils.waitReceipt(tx.tx)
        let group = await smg.getGroupInfo(id)
        assert.equal(group.status, 1)
        assert.equal(group.groupId, id)
        assert.equal(group.deposit, 0)
        assert.equal(group.depositWeight, 0)
        assert.equal(group.memberCount, 0)
        console.log("group:", group)
    })
    it('test stakeIn prepare', async()=>{
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
                to: contractAddress,
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
            let candidate  = await smg.getSmInfo(id, sw.addr)
            console.log("candidate:", candidate)
            assert.equal(candidate.sender.toLowerCase(), sf.addr)
            assert.equal(candidate.pkAddress.toLowerCase(), sw.addr)
            assert.equal(candidate.deposit, stakingValue)
        }
    })
    it('test stakeIn', async()=>{
            let stakingValue = 6000;
            let deFee = 5;
            let tx =  await smg.stakeIn(id, wPK,wPK,deFee, {value:stakingValue})
            
            console.log("txhash stakeIn:", tx.tx)
            await utils.waitReceipt(tx.tx)
            let candidate  = await smg.getSmInfo(id, wAddr)
            console.log("candidate:", candidate)
            assert.equal(candidate.sender.toLowerCase(), tester)
            assert.equal(candidate.pkAddress.toLowerCase(), wAddr)
            assert.equal(candidate.deposit, stakingValue)
    })
    it('test stakeIn2', async()=>{
        let stakingValue = 1000;
        let deFee = 5;
        let tx =  await smg.stakeIn(id, wPK2,wPK2,deFee, {value:stakingValue})
        
        console.log("txhash stakeIn:", tx.tx)
        await utils.waitReceipt(tx.tx)
        let candidate  = await smg.getSmInfo(id, wAddr2)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester)
        assert.equal(candidate.pkAddress.toLowerCase(), wAddr2)
        assert.equal(candidate.deposit, stakingValue)
    })

    it('test delegateIn', async()=>{
        let payCount=1;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wAddr, {from:tester, value:delegateValue});
            await utils.waitReceipt(tx.tx)
        }
        let candidate  = await smg.getSmInfo(id, wAddr)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wAddr, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit, delegateValue*payCount)
        console.log("nde: ", nde)

        let de2 = await smg.getSmDelegatorAddr(wAddr, 0);
        console.log("de2:", de2);
        
    })

    it('test delegateIn2', async()=>{
        let payCount=2;
        let delegateValue = 100
        for(k=0; k<payCount; k++) {
            tx = await smg.delegateIn(wAddr2, {from:tester, value:delegateValue});
            await utils.waitReceipt(tx.tx)
        }
        let candidate  = await smg.getSmInfo(id, wAddr2)
        assert.equal(candidate.delegatorCount, 1)
        console.log("after delegateIn,  candidate:",candidate)

        let nde = await smg.getSmDelegatorInfo(wAddr2, tester);
        assert.equal(nde.incentive, 0)
        assert.equal(nde.deposit, delegateValue*payCount)
        console.log("nde: ", nde)

        let de2 = await smg.getSmDelegatorAddr(wAddr2, 0);
        console.log("de2:", de2);
        
    })

    it('[StoremanGroupDelegate_delegateOut] should fail: selecting', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateOut(wAddr, {from: tester})
            console.log("delegateOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, 'selecting time, can\'t quit');
    })
  
    it('test toSelect', async ()=>{
        await pu.sleep(10000)
        let tx = await smg.toSelect(id,{from: tester})
        console.log("toSelect tx:", tx.tx)
        await utils.waitReceipt(tx.tx)
        console.log("group:",await smg.getGroupInfo(id))

        
        let count = await smg.getSelectedSmNumber(id)
        console.log("selected count :", count)
        assert.equal(count, memberCountDesign)
    })
    it('[StoremanGroupDelegate_delegateOut] should success', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateOut(wAddr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
        let candidate  = await smg.getSmInfo(id, wAddr)
        console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), tester)
        assert.equal(candidate.pkAddress.toLowerCase(), wAddr)
    })
    it('[StoremanGroupDelegate_delegateClaim] should fail: not dismissed', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateClaim(wAddr, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, 'group can\'t claim');
    })
    it('[StoremanGroupDelegate_stakeClaim] should success:', async () => {
        let result = {};
        try {
            let txhash = await smg.delegateClaim(wAddr2, {from: tester})
            console.log("stakeOut txhash:", txhash);
        } catch (e) {
            result = e;
            console.log("result:", result);
        }
        assert.equal(result.reason, undefined);
    })

})
