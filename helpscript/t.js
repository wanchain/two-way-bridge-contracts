const ethutil = require("ethereumjs-util");
const Web3 = require('web3')
const fs = require('fs')
const keccak256 = require("keccak256")
const Tx = require('ethereumjs-tx').Transaction
const owner ={
        priv:"0x303bc5cc3af0f655430909a4a3add6a411fa9c4b7f182a8d2a1a419614e818f0",
        addr:"0xF1cF205442Bea02E51e2c68ff4CC698E5879663c"
}

let web3 = new Web3(new Web3.providers.HttpProvider("http://192.168.1.179:7123")) 
const gGasPrice = 1000000000
const gGasLimit = 10000000
let scAddr;
function stringTobytes32(name){
        let b = Buffer.alloc(32)
        b.write(name, 32-name.length,'utf8')
        let id = '0x'+b.toString('hex')
        return id
    }
function getAddressFromInt(i){
        let b = Buffer.alloc(32)
        b.writeUInt32BE(i,28)
        let pkb = ethutil.privateToPublic(b)
        //console.log("priv:", '0x'+b.toString('hex')) 
        let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
        let pk = '0x'+pkb.toString('hex')
        console.log("got address: %s, %s",addr, pk)
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


// async function smg() {
//         let scAddr = "0x24D8Ae2089Cee8Bde68c59f2d957e2D881981748"
//         let wkAddr = "0xf3af99d9e7cc732968ccc04595ba6c0b72621a64"
//         let web3 = new Web3(new Web3.providers.HttpProvider("http:/192.168.1.179:7654"))
//         let abiString = fs.readFileSync('helpscript/abi.StoremanGroupDelegate.json', 'utf-8');
//         let abi = JSON.parse(abiString);
//         let smg = new web3.eth.Contract(abi, scAddr)
//         let smgInfo = await smg.methods.getStoremanInfo(wkAddr).call()
//         console.log("smgInfo:", smgInfo)
// }

function pub(){
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
async function sendTransaction2(sf, value, sdata, to){
        console.log("=======================================sendTransaction2:", sf, value, sdata, to)
        console.log("web3.eth.getTransactionCount:", await web3.eth.getTransactionCount(owner.addr))
        let nonce = await web3.eth.getTransactionCount(sf.addr,"pending")
        console.log("nonce:", nonce)
        let rawTx = {
                nonce:  nonce,
                gasPrice: gGasPrice,
                gas: gGasLimit,
                to: to,
                chainId: 3,
                value: 0x01,
                data: sdata,
        }
        console.log("rawTx:", rawTx)
        let tx = new Tx(rawTx)
        let pri = sf.priv
    
        if(typeof(pri) == 'string'){
            pri = Buffer.from(sf.priv.slice(2), 'hex')
        }
        tx.sign(pri)
        const serializedTx = '0x'+tx.serialize().toString('hex');
        console.log("serializedTx:", serializedTx)
        let receipt = await web3.eth.sendSignedTransaction(serializedTx)
        return receipt
}
async function toDelegateIn(smg, wkAddr, index=30000,count=1, value=100){
        let sdata =  smg.methods.delegateIn(wkAddr).encodeABI()


        for(let i=index; i<index+count;i++){
                let d = getAddressFromInt(i)
                await sendTransaction2(owner, web3.utils.toWei('1'), "0x00",d.addr);
                await sendTransaction2(d, value, sdata,scaddr);
        }
}

async function n1() {


        let web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"))
        console.log("web3.eth.getTransactionCount:", await web3.eth.getTransactionCount(owner.addr))

        console.log("web3.eth.getTransactionCount:", await web3.eth.getBlockNumber())

        let file = 'build/contracts/StoremanGroupDelegate.json'
        let content = fs.readFileSync(file, 'utf8')
        let conf = JSON.parse(content)
        scaddr = conf.networks["3"].address
        console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXscAddr:", conf.networks["3"].links)
        console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXscAddr:", scaddr)
        let abi = conf.abi

        let ins = new  web3.eth.Contract(abi, scaddr);

        let d = getAddressFromInt(1999)
        console.log("from to", owner.addr, d.addr)
        //await sendTransaction2(owner, web3.utils.toWei('1'), "0x00",d.addr);



        await toDelegateIn(ins, "0xf3af99d9e7cc732968ccc04595ba6c0b72621a64")
}

async function main() {


        let web3 = new Web3(new Web3.providers.HttpProvider("http://gwan-testnet.wandevs.org:36891")) 

        let file = 'helpscript/abi.StoremanGroupDelegate.json'
        let content = fs.readFileSync(file, 'utf8')
        let abi = JSON.parse(content)
        scaddr = "0x63687EAAdeBfB529da387275771c20cA0FeE6e5B"

        //let abi = conf.abi

        let ins = new  web3.eth.Contract(abi, scaddr);

        let smInfo = await ins.methods.getStoremanGroupInfo(stringTobytes32("jacob")).call()
        console.log("smInfo:", smInfo)

        smInfo = await ins.methods.getStoremanGroupInfo(stringTobytes32("jacob_1")).call()
        console.log("smInfo:", smInfo)



        // smInfo = await ins.methods.getStoremanIncentive("0x41e5C97CbAD66730A48717e94Ba9893eF9c9dC46", 18518).call()
        // console.log("smInfo:", smInfo)


       
}


async function event() {

        let file = 'helpscript/abi.StoremanGroupDelegate.json'
        let content = fs.readFileSync(file, 'utf8')
        let abi = JSON.parse(content)
        scaddr = "0x63687EAAdeBfB529da387275771c20cA0FeE6e5B"

        //let abi = conf.abi

        let ins = new  web3.eth.Contract(abi, scaddr);


        let options = {
                fromBlock: 930000,
        }
        let event = await ins.getPastEvents("storemanTransferEvent", options)
        console.log("event: ", event[0].returnValues)

        // event = await ins.getPastEvents("StoremanGroupRegisterStartEvent", options)
        // console.log("event: ", event)

        // let smInfo = await ins.methods.getStoremanInfo("0xE6f60216EE4773Aa4e98ffe536fa42193C2e75A0").call()
        // console.log("smInfo:", smInfo)

        smInfo = await ins.methods.getSelectedStoreman(stringTobytes32("jacob")).call()
        console.log("smInfo:", smInfo)

        smInfo = await ins.methods.getSelectedStoreman(stringTobytes32("jacob_1")).call()
        console.log("smInfo:", smInfo)

        
}
event();
