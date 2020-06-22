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
    let tester = accounts[0]
    let now = parseInt(Date.now()/1000);
    let id = utils.stringTobytes32(now.toString())
    const WhiteCount = 4

    let  smg
    let tsmg

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
        assert.equal(group.memberCount, 0)
        console.log("group:", group)
    })
})
