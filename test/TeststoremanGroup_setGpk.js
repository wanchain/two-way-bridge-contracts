const lib = require("./lib");
const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const pu = require('promisefy-util')
const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');

const wanUtil = require('wanchain-util');
const Tx = wanUtil.wanchainTx;
//const Tx = require("ethereumjs-tx")
let contractAddress =  undefined 

let web3 = new Web3(new Web3.providers.IpcProvider('/home/lzhang/.wanchain/pluto/gwan.ipc',net))


let EOS = utils.stringTobytes("EOS")


contract('TestSmg', async(accounts)=>{
    let tester = accounts[0]

    let id = utils.stringTobytes32(Date.now().toString())
    let smgDelegate 
    let tsmg;

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smgDelegate = await StoremanGroupDelegate.deployed();
        await smgProxy.upgradeTo(smgDelegate.address);
    
        tsmg = await TestSmg.deployed();
        await tsmg.setSmgAddr(smgDelegate.address)




        let tmProxy = await TokenManagerProxy.deployed();
        let tm = await TokenManagerDelegate.deployed();
        //await tmprx.upgradeTo(tm.address);

        await smgDelegate.setDependence(tmProxy.address, tmProxy.address);

        await tm.addToken(EOS, 10000,'0x'+web3.utils.toWei("10").toString('hex'),60 * 60 * 72,EOS,EOS,8)
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
        let tx = await smgDelegate.registerStart(id,10000,21,17, 90, 14,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        console.log("tx:", tx)
        console.log("group:",await smgDelegate.groups(id))
    })
    
    // it('storemanGroupRegister', async() => {
    //     let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
    //    let tx =  await smgDelegate.storemanGroupRegister(EOS, id, gpk,100)
    //    console.log("storemanGroupRegister tx:", tx)
    //    console.log("gtm:", await smgDelegate.gtm());
    // })
    // it('setGpk', async() => {
    //     let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
    //    let tx =  await smgDelegate.setGpk(id, gpk)
    //    console.log("setGpk tx:", tx)
    // })

    it('testSetGpk', async() => {
        let gpk = "0x04d2386b8a684e7be9f0d911c936092035dc2b112fe8c83fb602beac098183800237d173cf0e1e5a8cbb159bcdbdfbef67e25dbcc8b852e032aa2a9d7b0fe912a4"
       let tx =  await tsmg.testSetGpk(id, gpk)
       console.log("tx:", tx)
    })

})
