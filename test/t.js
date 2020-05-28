const utils = require("./utils");
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))

function main() {


        let typesArray = ['bytes','bytes32','address','uint'];
        let xhash = utils.stringTobytes32("xhash")
        let waddr =  utils.getAddressFromInt(3).addr
        let EOS = utils.stringTobytes("EOS")
        let value = 100;
        let parameters = [EOS, xhash,waddr, value];
        console.log("parameters++++++++++++++++:",parameters)
    
        let data = web3.eth.abi.encodeParameters(typesArray, parameters)
        console.log("data:", data);


}


main();