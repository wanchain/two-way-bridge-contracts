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



contract('StoremanGroupDelegate', async (accounts) => {
    let smgDelegate
    let tester = accounts[0]
    let id = utils.stringTobytes32(Date.now().toString())
    const memberCountDesign = 4
    const threshold  = 3

    before("init contracts", async() => {
        if(!contractAddress) {
            let smgProxy = await StoremanGroupProxy.deployed();
            smgDelegate = await StoremanGroupDelegate.deployed();
            await smgProxy.upgradeTo(smgDelegate.address);
            contractAddress = smgDelegate.address
            console.log("==============================storemanGroup contractAddress: ", contractAddress)
        }

    
        tsmg = await TestSmg.deployed();
        await tsmg.setSmgAddr(smgDelegate.address)

        let tmProxy = await TokenManagerProxy.deployed();
        let tm = await TokenManagerDelegate.deployed();
        //await tmprx.upgradeTo(tm.address);

        await smgDelegate.setDependence(tmProxy.address, tmProxy.address);

        await tm.addToken(EOS, 10000,'0x'+web3.utils.toWei("10").toString('hex'),60 * 60 * 72,EOS,EOS,8)
        let t = await tm.getTokenInfo(EOS)
        console.log("tokens:", t)

    })



    it('registerStart_1 ', async ()=>{
        let count = 4;
        let wks = []
        let srs= []
        for(let i=0; i<count;i++){
            let {addr:sr} = utils.getAddressFromInt(i+1000)
            let {addr:wk} = utils.getAddressFromInt(i+2000)
            wks.push(wk)
            srs.push(sr)
        }
        let tx = await smgDelegate.registerStart(id,memberCountDesign,threshold,12345, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await smgDelegate.groups(id))
    })
})
