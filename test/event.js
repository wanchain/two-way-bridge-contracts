const fs = require('fs')
const Web3 = require('web3')

let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))

async function main(){
    let addr = "0x9aA39DE783b025e48aA677B09E7a1c24196e38FD";
    let content = fs.readFileSync("./build/contracts/StoremanGroupDelegate.json","utf8")
    let json = JSON.parse(content);
    console.log("abi:", json.abi)
    let smg = new web3.eth.Contract(json.abi, addr)
    let e = await smg.getPastEvents({fromBlock:0, topic:[sha256("EOS")]});
    console.log("e:", e)
    let cur = web3.eth.blockNumber;
    console.log("cur:", cur)
}

main();