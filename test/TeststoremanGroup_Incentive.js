const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const pu = require('promisefy-util')

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
//const Tx = require("ethereumjs-tx")
let contractAddress =  undefined 

let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let gGasLimit=900000;
let gGasPrice=200000000000;

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/

 /*
 * @param sol
 * @param address
 * @returns {Promise<*>}
 */
async function deploy(sol, address) {
    let contract;
    if (!await sol.isDeployed()) {
        if(contractAddress){
            contract = await utils.contractAt(sol, contractAddress);
        } else {
            contract = await utils.deployContract(sol, { from: address });
            contractAddress = contract.address
            console.log("new contractAddress:",contractAddress)
        }
    } else {
        contract = await utils.contractAt(sol, sol.address);
    }
    lib.assertExists(contract);
    return contract;
}

async function initContracts(accounts) {
    return await deploy(StoremanGroupDelegate, accounts[0])
}


contract('StoremanGroupDelegate', async (accounts) => {
    let testInstance
    let tester = accounts[0]
    let id = utils.stringTobytes32("20200419_ETH_fund_group02")

    before("init contracts", async() => {
        testInstance = await initContracts(accounts);
        console.log("testInstance address:",testInstance.address)
    })

    it('test add group', async ()=>{
        let tx = await testInstance.addGroup(10, id,{from: tester})
        console.log("tx:", tx)
        console.log("group:",await testInstance.groups(id))
    })
    /*
    it('test incentive', async ()=>{
        for(let i=0; i<1; i++) {
            let tx = await testInstance.testIncentiveAll(id,{from: tester})
            console.log("incentive tx:", tx)
        }
    })
    */
})
