const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')

const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const CreateGpkProxy = artifacts.require('CreateGpkProxy');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
let contractAddress = undefined //    "0x4553061E7aD83d83F559487B1EB7847a9F90ad59"; //   

//let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))
let web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.179:7654'))
let gGasLimit=9000000;
let gGasPrice=200000000000;

/*************************************
staker: 1000 ~ 1000+100
delegator: stakerId*100 ~ stakerID*100+1000
 ****************************************/



let EOS = utils.stringTobytes("EOS")



contract('TestSmg', async (accounts) => {
    let tester = accounts[0]
    let id = utils.stringTobytes32(Date.now().toString())
    const memberCountDesign = 4
    const threshold  = 3
    let smgProxy
    let  smg

    before("init contracts", async() => {
        if(!contractAddress) {
            smgProxy = await StoremanGroupProxy.deployed();

            smg = await StoremanGroupDelegate.at(smgProxy.address)
            contractAddress = smgProxy.address
            console.log("==============================storemanGroup smgProxy contractAddress: ", contractAddress)
        }

        let gpkProxy = await CreateGpkProxy.deployed();
        console.log("CreateGpk contractAddress: %s", gpkProxy.address);
    
        tsmg = await TestSmg.deployed();
        await tsmg.setSmgAddr(smgProxy.address)

        let tmProxy = await TokenManagerProxy.deployed();
        let tm = await TokenManagerDelegate.at(tmProxy.address);

        //await smg.setDependence(tmProxy.address, tmProxy.address);

        await tm.addToken(EOS, 10000,'0x99999999',60 * 60 * 72,EOS,EOS,8)
        let t = await tm.getTokenInfo(EOS)
        console.log("tokens:", t)

    })



    it('registerStart_1 ', async ()=>{
        let count = 5;
        let wks = []
        let srs= []
        for(let i=0; i<count;i++){
            let {addr:wk} = utils.getAddressFromInt(i+100)
            let {addr:sr} = utils.getAddressFromInt(i+200)
            wks.push(wk)
            srs.push(sr)
        }
        let tx = await smg.registerStart(id,memberCountDesign,threshold,12345, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await smg.groups(id))
    })
    
    it('storemanGroupRegister', async() => {
        let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
       let tx =  await smg.storemanGroupRegister(EOS, id, gpk,100)
       console.log("storemanGroupRegister tx:", tx)
    })
    it('setGpk', async() => {
        let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
       let tx =  await smg.setGpk(id, gpk)
       console.log("setGpk tx:", tx)
    })

    // it('testSetGpk', async() => {
    //     let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
    //    let tx =  await tsmg.testSetGpk(id, gpk)
    //    console.log("tx:", tx)
    // })

})
