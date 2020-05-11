
const Web3 = require('web3')
const net = require('net')
let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')


async function getAddressFromInt(i){
    let b = Buffer.alloc(32)
    b.writeUInt32LE(i,28)
    let pkb = ethutil.privateToPublic(b)
    let priv = '0x'+b.toString('hex')
    let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
    let pk = '0x'+pkb.toString('hex')
    let accounts = await pu.promisefy(web3.eth.getAccounts, [],web3.eth)
    try {
        let tx = await pu.promisefy(web3.eth.sendTransaction,[{from: accounts[0], to: addr, value: web3.utils.toWei("300")}],web3.eth);
        //console.log("tx:", tx)
    }catch(err){
        console.log("err:", err)
    }
    console.log(addr, "private key", '0x'+i.toString(16))
    return {addr, pk, priv:b}
}

async function main() {
    let count=30
    let dlCount = 10
    for(let i=0; i<count; i++){
        let a = await getAddressFromInt(i+1000)
        for(let j=0; j<dlCount; j++){
            let a = await getAddressFromInt((i+1000)*1000*10+j)
            console.log("got address: ", i, j, a.addr)
        }
    }
}
main();