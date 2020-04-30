const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const TestStoremanGroup = artifacts.require('TestStoremanGroup')
const pu = require('promisefy-util')

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
//const Tx = require("ethereumjs-tx")
let contractAddress =    "0xdE28d2A57c3bDfB872e9F601268CfcdC7E352761";//"0xCa3DACe8958B20006E25F63643c47Ad4177f282f" //   undefined //

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
    return await deploy(TestStoremanGroup, accounts[0])
}
function stringTobytes32(name){
    let b = Buffer.alloc(32)
    b.write(name, 32-name.length,'ascii')
    let id = '0x'+b.toString('hex')
    console.log("id:",id)
    return id
}

async function getAddressFromInt(i){
    let b = Buffer.alloc(32)
    b.writeUInt32LE(i,28)
    let pkb = ethutil.privateToPublic(b)
    let priv = '0x'+b.toString('hex')
    let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
    let pk = '0x'+pkb.toString('hex')
    //let accounts = await web3.eth.accounts
    //await web3.eth.sendTransaction({from: accounts[0], to: addr, value: web3.toWei(10)})
    console.log("got address: ",addr)
    return {addr, pk, priv:b}
}
async function waitReceipt(txhash) {
    let lastBlock = await pu.promisefy(web3.eth.getBlockNumber, [], web3.eth)
    let newBlock = lastBlock
    while(newBlock - lastBlock < 10) {
        await pu.sleep(1000)
        newBlock = await pu.promisefy(web3.eth.getBlockNumber, [], web3.eth)
        if( newBlock != lastBlock) {
            let rec = await pu.promisefy(web3.eth.getTransactionReceipt, [txhash], web3.eth)
            if ( rec ) {
                return rec
            }
        }
    }
    assert(false,"no receipt goted in 10 blocks")
    return null
}

contract('TestStoremanGroup', async (accounts) => {
    let testInstance
    let tester = accounts[0]
    let id = stringTobytes32("20200419_ETH_fund_group02")

    before("init contracts", async() => {
        testInstance = await initContracts(accounts);
        console.log("testInstance address:",testInstance.address)
    })

    it('test add group', async ()=>{
        let tx = await testInstance.addGroup(10, id,{from: tester})
        console.log("tx:", tx)
        console.log("group:",await testInstance.groups(id))
    })
    it('test add candidate', async()=>{
        let stakerCount = 25
        for(let i=0; i<stakerCount; i++){
            let sf = await getAddressFromInt(i+1000)
            let sw = await getAddressFromInt(i+2000)
            let sdata =  testInstance.contract.methods.addStaker(id, sw.pk,sw.pk,2000+i).encodeABI()
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
            await waitReceipt(txhash)
            console.log("txhash i:", i, txhash)


            let deCount=2;
            let deleTxs = new Array(deCount)
            for(let j=0; j<deCount; j++){
                let de = await getAddressFromInt((i+1000)*10*1000 + j)
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
                //console.log("rawTx j:", j, rawTx)

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
        let count = await testInstance.getSelectedSmNumber(id)
        console.log("count :", count)

        for(let i=0; i<count; i++) {
            let skAddr = await testInstance.getSelectedSmAddress(id, i)
            let sk = await testInstance.getSmInfo(id, skAddr);
            console.log("sk, i:", i, sk)
        }

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
