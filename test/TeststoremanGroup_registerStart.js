const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')

//const TestSmg = artifacts.require('TestSmg')
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
    let id = utils.stringTobytes32(Date.now().toString())
    let gaddr = '0xf223ebd621fc35417023fdc52d3cc55de672e6de'
    //let gpk = '0x047793ef5f8e57e872ea9fbb18bd710ab96ea4f646134d3308930cbf62e73f0e1c8d5b3b793573090fa4a7e7e5c38fd987e889bc3e720e05b243e856f632ae7cc5'
    let gpk = '0x04a4a90e6b3914780a66e3d34134478ffe455b657705d9c71bf48f66b52e486ed8362d850558f152ff03a5210a63625438cbaa9cb924bd90d597299cf9c3bcbe70';
    let skSmg ='0x000000000000000000000000000000000000000000000000000000000000270f'


    const memberCountDesign = 4
    const threshold  = 3
    let smgProxy
    let  smg

    before("init contracts", async() => {
        smgProxy = await StoremanGroupProxy.deployed();

        smg = await StoremanGroupDelegate.at(smgProxy.address)
        contractAddress = smgProxy.address
        console.log("==============================storemanGroup smgProxy contractAddress: ", contractAddress)

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
        let tx = await smg.registerStart(id,memberCountDesign,threshold,12345, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await smg.groups(id))
    })
})
