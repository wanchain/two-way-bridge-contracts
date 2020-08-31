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
                "0xcd3d3e79cbce8715e30dcb73bcc68611b1792a6bb6bb357ccd1deec970366237",
                "0xbb9f0119817031dfe6fd372bbb8a43f6953841ce1b7d501a10d478866eb56b12",
                "0x2e2c3a832c6e9ae01b419465a220cc7bc5e146b28d5e3b8cb1c55f43129acf9a",
                "0x6b4f50820a34a07062f82d18b18eb21ed487b9330e5b23561269ca553245b058",
                "0xea717b9853d27a8f630ccaa0c912eaa72f6a75760bb556f614240fa79eacdeb4",
                "0xe393304caf4177b6dcbc00e4bf1cc1ec3df33c24f88a6d7aa8b3e9e537d095b4",
                "0x193a6b04f084166f5bd1388f0b5a9b0993e2cd2f4ce4b33fffc3773cf8482955",
                "0xc3f7ef24e11de51220655ade6b664247cebb5217b6fba2da2f071fc4062a6060",
                "0x919ccad7268b2e78a017a3e2d01ead75b8a4d5587bd39b06717f16603242d324",
                "0xa2c9d0e04175798fd802035fd38add1a007513083886071ae8385608e9dcf619",
                "0x5f198640728c2474d5c00bd25ad158d5b81eb76140918bbd8152704aaece0c8f",
        ]
        let pks = []
        for(let i=0; i<ps.length; i++){
                let pk = prikToPub(ps[i]);
                pks.push(pk)
        }
        console.log("pks:", pks)
}
main();
