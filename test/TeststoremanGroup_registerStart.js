const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
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
    let id = utils.stringTobytes32(Date.now().toString())

    before("init contracts", async() => {
        testInstance = await initContracts(accounts);
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
        let tx = await testInstance.registerStart(id,10000,21,17,12345, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await testInstance.groups(id))
    })
})
