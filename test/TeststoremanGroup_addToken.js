const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate')
const pu = require('promisefy-util')

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
//const Tx = require("ethereumjs-tx")
let contractAddress =  undefined 

let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let gGasLimit=900000;
let gGasPrice=200000000000;

let EOS = utils.stringTobytes("EOS")


contract('StoremanGroupDelegate', async (accounts) => {
    let testInstance
    let tester = accounts[0]
    let id = utils.stringTobytes32(Date.now().toString())

    before("init contracts", async() => {

        let tm = await TokenManagerDelegate.deployed()
        await tm.addToken(EOS, 10000,'0x'+web3.utils.toWei("10").toString('hex'),60 * 60 * 72,EOS,EOS,8)
        testInstance = await StoremanGroupDelegate.deployed()
        console.log("testInstance address:",testInstance.address)
    })



    it('registerStart_1 ', async ()=>{
        let count = 5;
        let wks = []
        let srs= []
        for(let i=0; i<count;i++){
            let {addr:wk} = utils.getAddressFromInt(i+100)
            let {addr:sr} = utils.getAddressFromInt(i+200)
            wks.push(wk)
            srs.push(sr)
        }
        let tx = await testInstance.registerStart(id,10000,21,17, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await testInstance.groups(id))
    })
})
