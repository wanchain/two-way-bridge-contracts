const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')
const PosLib = artifacts.require('PosLib');


// async function tryPoslib(poslib, deposit, epochId)  {
//     let dedata = poslib.contract.methods.getMinIncentive(deposit, epochId, 10000,10000).encodeABI()
//     let rawTx = {
//         Txtype: 0x01,
//         nonce: await pu.promisefy(web3.eth.getTransactionCount,[de.addr,"pending"], web3.eth),
//         gasPrice: gGasPrice,
//         gasLimit: gGasLimit,
//         to: contractAddress,
//         chainId: 6,
//         value: value,
//         data: dedata,
//     }
//     //console.log("rawTx:", rawTx)
//     let tx = new Tx(rawTx)
//     tx.sign(de.priv)
//     const serializedTx = '0x'+tx.serialize().toString('hex');
//     txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
//     return txhash;
// }

async function trygetMinIncentive(poslib, deposit, epochId){
    let tx = await poslib.getMinIncentive(deposit,epochId, 10000,10000);
    console.log("getMinIncentive:", tx)
}
async function test() {
    let poslibAddr = await PosLib.deployed();

    let poslib = await PosLib.at("0x35a45e751104FFCD476247081101b321A13F8f91"); //poslibAddr.address
    let now = parseInt(Date.now()/1000);

    await trygetMinIncentive(poslib, 1000000, now- 3 * 3600*24)
}

contract('TestSmg', async (accounts) => {
    it("get incentive", async ()=>{
        console.log("xxxxx")
        await test();
    })
})

