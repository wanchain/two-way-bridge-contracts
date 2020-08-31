const ethutil = require("ethereumjs-util");
const Web3 = require('web3')
const fs = require('fs')
const keccak256 = require("keccak256")

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

function prikToPub(prik){
        let b = Buffer.from(prik.slice(2),'hex')
        let pkb = ethutil.privateToPublic(b)
        let pk = '0x'+pkb.toString('hex')
        console.log("pk: ",  pk);
        console.log("addr:", '0x'+ethutil.pubToAddress(pkb).toString('hex'))
        return pk
}
function f3() {
        let pri = "949077a1ad13215b0436b748f6afb07b837aebbe1038bc1e48ebdac49782f8b0"

        let priv = Buffer.from(pri, 'hex');
        let pkb = ethutil.privateToPublic(priv)
        console.log("pk:", pkb.toString('hex'))


}

async function smg() {
        let scAddr = "0x24D8Ae2089Cee8Bde68c59f2d957e2D881981748"
        let wkAddr = "0xf3af99d9e7cc732968ccc04595ba6c0b72621a64"
        let web3 = new Web3(new Web3.providers.HttpProvider("http:/192.168.1.179:7654"))
        let abiString = fs.readFileSync('helpscript/abi.StoremanGroupDelegate.json', 'utf-8');
        let abi = JSON.parse(abiString);
        let smg = new web3.eth.Contract(abi, scAddr)
        let smgInfo = await smg.methods.getStoremanInfo(wkAddr).call()
        console.log("smgInfo:", smgInfo)
}

function main(){
        let functionSelector = keccak256("getPosAvgReturn(uint256)").toString('hex');
        console.log("functionSelector: ", functionSelector)
        let ps = [
                "0x949077a1ad13215b0436b748f6afb07b837aebbe1038bc1e48ebdac49782f8b0",
        ]
        let pks = []
        for(let i=0; i<ps.length; i++){
                let pk = prikToPub(ps[i]);
                pks.push(pk)
        }
        console.log("pks:", pks)
}
main();
