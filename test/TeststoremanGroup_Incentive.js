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

//let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))
let gGasLimit=9000000;
let gGasPrice=200000000000;

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/


contract('TestSmg', async (accounts) => {
    let id = "0x0000000000000000000000000000000000000031353930303435363333303733"
    let  smg

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        console.log("==============================storemanGroup smgProxy contractAddress: ", smgProxy.address)

    })


    it('incentive ', async ()=>{
        let count = await smg.getSelectedSmNumber(id)
        console.log("count :", count)
        console.log("group:",await smg.groups(id))

            let  skAddr = await smg.getSelectedSmInfo(id, 1)
            console.log("skAddr:", skAddr)
                let tx = await smg.testIncentiveAll(id,skAddr['0'])
                let rec = await utils.waitReceipt(tx.tx);
                console.log("rec:",rec.logs[0].topics[3]==1)
                console.log("rec:",rec.logs[0].topics)
                console.log("rec:",rec)

        // for(let i=0; i<count; i++) {
        //     let  = await smg.getSelectedSmInfo(id, i)
        //     console.log("skAddr:", i,skAddr)
        //     while(true){
        //         let tx = await smg.testIncentiveAll(id,skAddr['0'])
        //         let rec = await utils.waitReceipt(tx.tx);
        //         console.log("rec:",rec)
        //     }




    })
})
