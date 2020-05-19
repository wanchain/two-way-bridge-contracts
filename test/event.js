const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))

async function main(){

    let cur = web3.eth.blockNumber;
    console.log("cur:", cur)
}

main();