const utils = require("./utils");
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))
const ethutil = require("ethereumjs-util");


function getAddressFromInt(i){
        let b = Buffer.alloc(32)
        b.writeUInt32BE(i,28)
        let pkb = ethutil.privateToPublic(b)
        //console.log("priv:", '0x'+b.toString('hex')) 
        let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
        let pk = '0x'+pkb.toString('hex')
        console.log("got address: ",addr, pk)
        return {addr, pk, priv:b}
      }

function f3() {



        getAddressFromInt(200000)
        getAddressFromInt(200001)


}


f3();
