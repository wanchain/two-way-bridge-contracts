const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const pu = require('promisefy-util')
const assert = require('chai').assert;

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
let contractAddress = undefined //    "0x4553061E7aD83d83F559487B1EB7847a9F90ad59"; //   

let EOS = utils.stringTobytes("EOS")

let gGasLimit=9000000;
let gGasPrice=200000000000;


const { registerStart,stakeInPre, web3url,g } = require('./base.js')

contract('StoremanGroupDelegate', async (accounts) => {
 
    let  smg
    let groupId
    let web3 = new Web3(new Web3.providers.HttpProvider(web3url))

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)

    })


    it('registerStart', async ()=>{
        groupId = await registerStart(smg);
        console.log("groupId: ", groupId)
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })
    
    it('test select', async ()=>{
        let tx = await smg.select(groupId,{from: g.leader})
        console.log("select tx:", tx)
        await utils.waitReceipt(tx.tx)
        console.log("group:",await smg.getStoremanGroupInfo(groupId))

        
        let count = await smg.getSelectedSmNumber(groupId)
        assert.equal()
        console.log("count :", count)

        for(let i=0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(groupId, i)
            console.log("skAddr:", i,skAddr)
            let sk = await smg.getStoremanInfo(skAddr[0]);
            console.log("sk, i:", i, sk)
        }

    })
})
