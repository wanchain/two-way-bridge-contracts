const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')

const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
let contractAddress = undefined //    "0x4553061E7aD83d83F559487B1EB7847a9F90ad59"; //   

//let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))
let gGasLimit=9000000;
let gGasPrice=200000000000;

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/


let EOS = utils.stringTobytes("EOS")


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
        let smgProxy = await StoremanGroupProxy.deployed();

        smg = await StoremanGroupDelegate.at(smgProxy.address)
        contractAddress = smgProxy.address
        console.log("==============================storemanGroup smgProxy contractAddress: ", contractAddress)


    
        tsmg = await TestSmg.deployed();
        await tsmg.setSmgAddr(smgProxy.address)

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
        assert.equal(group.memberCount, 1)
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

    it('registerStart_1 ', async ()=>{
        let wks = []
        let srs= []
        for(let i=0; i<WhiteCount;i++){
            let {addr:sr} = utils.getAddressFromInt(i+1000)
            let {addr:wk} = utils.getAddressFromInt(i+2000)
            wks.push(wk)
            srs.push(sr)
        }
        let oldid = id;
        let now = parseInt(Date.now()/1000);
        id  = utils.stringTobytes32(now.toString())
        let tx = await smg.registerStart(id,now+10, 90, 10,33,oldid, utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("registerStart txhash:", tx.tx)
        await utils.waitReceipt(tx.tx)
        let group = await smg.getGroupInfo(id)
        assert.equal(group.status, 1)
        assert.equal(group.groupId, id)
        assert.equal(group.deposit, 0)
        assert.equal(group.depositWeight, 0)
        assert.equal(group.memberCount, 4)
        console.log("group:", group)
    })

})
