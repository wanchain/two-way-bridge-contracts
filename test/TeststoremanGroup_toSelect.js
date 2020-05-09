const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const pu = require('promisefy-util')

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
let contractAddress = undefined //    "0x4553061E7aD83d83F559487B1EB7847a9F90ad59"; //   

let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let gGasLimit=9000000;
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
    if(contractAddress){
        contract = await utils.contractAt(sol, contractAddress);
        console.log("old contractAddress:",contractAddress)
    } else {
        if (!await sol.isDeployed()) {
            contract = await utils.deployContract(sol, { from: address });
            contractAddress = contract.address
            console.log("new contractAddress:",contractAddress)
        } else {
            contract = await utils.contractAt(sol, sol.address);
            contractAddress = contract.address
            console.log("old old contractAddress:",contractAddress)
        }
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
    const memberCountDesign = 21

    before("init contracts", async() => {
        testInstance = await initContracts(accounts);
        console.log("testInstance address:",testInstance.address)
    })



    it('registerStart_1 ', async ()=>{
        let count = 5;
        let wks = []
        let srs= []
        for(let i=0; i<count;i++){
            let {addr:sr} = utils.getAddressFromInt(i+1000)
            let {addr:wk} = utils.getAddressFromInt(i+2000)
            wks.push(wk)
            srs.push(sr)
        }
        let tx = await testInstance.registerStart(id,10000,memberCountDesign,12345, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await testInstance.groups(id))
    })

    it('test stakeIn', async()=>{
        let stakerCount = 600
        for(let i=0; i<stakerCount; i++){
            let sf = utils.getAddressFromInt(i+1000)
            let sw = utils.getAddressFromInt(i+2000)
            let en = utils.getAddressFromInt(i+3000)
            let sdata =  testInstance.contract.methods.stakeIn(id, sw.pk,en.pk,2000+i).encodeABI()
            console.log("sdata:",sdata)
            let rawTx = {
                Txtype: 0x01,
                nonce:  await pu.promisefy(web3.eth.getTransactionCount,[sf.addr,"pending"], web3.eth),
                gasPrice: gGasPrice,
                gas: gGasLimit,
                to: contractAddress,
                chainId: 6,
                value: i+2000,
                data: sdata,
            }
            //console.log("rawTx:", rawTx)
            let tx = new Tx(rawTx)
            tx.sign(sf.priv)
            const serializedTx = '0x'+tx.serialize().toString('hex');
            console.log("serializedTx:",serializedTx)
            //let txhash = await web3.eth.sendSignedTransaction(serializedTx)
            let txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth);
            await utils.waitReceipt(txhash)
            console.log("txhash i:", i, txhash)


            let deCount=2;
            for(let j=0; j<deCount; j++){
                let de = utils.getAddressFromInt((i+1000)*10*1000 + j)
                let dedata = testInstance.contract.methods.addDelegator(id,sw.addr).encodeABI()
                let rawTx = {
                    Txtype: 0x01,
                    nonce: await pu.promisefy(web3.eth.getTransactionCount,[de.addr,"pending"], web3.eth),
                    gasPrice: gGasPrice,
                    gasLimit: gGasLimit,
                    to: contractAddress,
                    chainId: 6,
                    value: j+10000,
                    data: dedata,
                }
                console.log("rawTx j:", j, rawTx)

                let tx = new Tx(rawTx)
                tx.sign(de.priv)
                const serializedTx = '0x'+tx.serialize().toString('hex');
                txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
                console.log("txhash i j:", i,j, txhash)
            }

            let candidate = undefined;
            while(!(candidate && candidate["2"] == deCount)){
                console.log("candicate i", i, candidate)
                await pu.sleep(3000)
                candidate  = await testInstance.getStaker(id, sw.addr)
            }
        }


    })
    it('test toSelect', async ()=>{
        let tx = await testInstance.toSelect(id,{from: tester})
        console.log("toSelect tx:", tx)
        await utils.waitReceipt(tx.tx)
        console.log("group:",await testInstance.groups(id))

        
        let count = await testInstance.getSelectedSmNumber(id)
        console.log("count :", count)

        for(let i=0; i<count; i++) {
            let skAddr = await testInstance.getSelectedSmAddress(id, i)
            console.log("skAddr:", i,skAddr)
            let sk = await testInstance.getSmInfo(id, skAddr[0]);
            console.log("sk, i:", i, sk)
        }

    })
})
