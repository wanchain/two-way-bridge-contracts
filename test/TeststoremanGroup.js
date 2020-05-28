const utils = require("./utils");
const Web3 = require('web3')
const net = require('net')
const ethutil = require("ethereumjs-util");
const pu = require('promisefy-util')
const schnorr = require('../utils/schnorr/tools.js');

const TestSmg = artifacts.require('TestSmg')
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const HTLCProxy = artifacts.require('HTLCProxy');
const HTLCDelegate = artifacts.require('HTLCDelegate');
const CreateGpkProxy = artifacts.require('CreateGpkProxy');
const PreCompile = artifacts.require('Enhancement');

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

async function tryAddDelegator(smg, id, skAddr, de, value)  {
    console.log("IDLLLLLLLLLLLL:", id, skAddr)
    let dedata = smg.contract.methods.addDelegator(id,skAddr).encodeABI()
    let rawTx = {
        Txtype: 0x01,
        nonce: await pu.promisefy(web3.eth.getTransactionCount,[de.addr,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gasLimit: gGasLimit,
        to: contractAddress,
        chainId: 6,
        value: value,
        data: dedata,
    }
    console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(de.priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth)
    return txhash;
}

contract('TestSmg', async (accounts) => {
    let tester = accounts[0]
    let now = parseInt(Date.now()/1000);
    //let id = utils.stringTobytes32(now.toString())
    let id = "0x0000000000000000000000000000000000000031353930303435363333303733"

    let gaddr = '0xf223ebd621fc35417023fdc52d3cc55de672e6de'
    //let gpk = '0x047793ef5f8e57e872ea9fbb18bd710ab96ea4f646134d3308930cbf62e73f0e1c8d5b3b793573090fa4a7e7e5c38fd987e889bc3e720e05b243e856f632ae7cc5'
    let gpk = '0x04d32f34db1cf3d028742081db75fb32b16d3e2ed2c0ea868d8c26c529933edbd573de0a0c462ac15411e6ff7b9d2d2123c5321f1c2590852406ae831ca2e016b0';
    let skSmg ='0x000000000000000000000000000000000000000000000000000000000000270f'
    let stakerCount = 7
    let deCount=1;


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

        let preCompile = await PreCompile.deployed();
        console.log("PreCompile contractAddress: %s", preCompile.address);
    
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
        let count = 4;
        let wks = []
        let srs= []
        for(let i=0; i<count;i++){
            let {addr:sr} = utils.getAddressFromInt(i+1000)
            let {addr:wk} = utils.getAddressFromInt(i+2000)
            wks.push(wk)
            srs.push(sr)
        }
        
        //registerStart(bytes32 id, uint workStart,uint workDuration, uint registerDuration, uint crossFee, bytes32 preGroupId, bytes chain, address[] wkAddrs, address[] senders)
        let tx = await smg.registerStart(id,now+10, 100, 10,33,utils.stringTobytes32(""), utils.stringTobytes("EOS"),wks,srs,
            {from: tester})
        //console.log("tx:", tx)
        console.log("group:",await smg.getGroupInfo(id))
    })
    it('test stakeIn', async()=>{
        let txs = [];
        for(let i=0; i<stakerCount; i++){
            let sf = utils.getAddressFromInt(i+1000)
            let sw = utils.getAddressFromInt(i+2000)
            let en = utils.getAddressFromInt(i+3000)
            let sdata =  smg.contract.methods.stakeIn(id, sw.pk,en.pk,666).encodeABI()
            //console.log("sdata:",sdata)
            let rawTx = {
                Txtype: 0x01,
                nonce:  await pu.promisefy(web3.eth.getTransactionCount,[sf.addr,"pending"], web3.eth),
                gasPrice: gGasPrice,
                gas: gGasLimit,
                to: contractAddress,
                chainId: 6,
                value: 2000,
                data: sdata,
            }
            //console.log("rawTx:", rawTx)
            let tx = new Tx(rawTx)
            tx.sign(sf.priv)
            const serializedTx = '0x'+tx.serialize().toString('hex');
            //console.log("serializedTx:",serializedTx)
            //let txhash = await web3.eth.sendSignedTransaction(serializedTx)
            let txhash = await pu.promisefy(web3.eth.sendSignedTransaction,[serializedTx],web3.eth);
            //await utils.waitReceipt(txhash)
            console.log("txhash i:", i, txhash)
            txs.push(txhash);



            // let candidate = undefined;
            // while(!(candidate && candidate["2"] == deCount)){
            //     console.log("candicate i", i, candidate)
            //     await pu.sleep(3000)
            //     candidate  = await smg.getStaker(id, sw.addr)
            // }
        }

        await pu.sleep(2);
        let ski = stakerCount-1;
        await utils.waitReceipt(txs[ski])
        for(let j=0; j<deCount; j++){
            let de = utils.getAddressFromInt((ski+1000)*10*1000 + j)
            let sw = utils.getAddressFromInt(ski+2000)
            console.log("sw.addr:===============:", sw.addr)
            let payCount=1;
            //if(j == deCount-1) payCount = 3;


            for(k=0; k<payCount; k++) {
                txhash = await tryAddDelegator(smg, id, sw.addr, de, 3000);
                //await pu.sleep(1000);
                console.log("txhash ski j:", ski,j, txhash)
            }

        }


    })

    it('test toSelect', async ()=>{
        await pu.sleep(10000)
        let tx = await smg.toSelect(id,{from: tester})
        //console.log("toSelect tx:", tx)
        await utils.waitReceipt(tx.tx)
        console.log("group:",await smg.getGroupInfo(id))

        
        let count = await smg.getSelectedSmNumber(id)
        console.log("count :", count)

    })
    it('setGpk', async() => {
        await pu.sleep(2000)
       let tx =  await smg.setGpk(id, gpk)
       //console.log("setGpk tx:", tx)
    })
    it('test append', async()=>{
        let i=stakerCount-1;
        let sw = utils.getAddressFromInt(i+2000)
        let j = deCount-1;

        let de = utils.getAddressFromInt((i+1000)*10*1000 + j)

        txhash = await tryAddDelegator(smg, id, sw.addr, de, 3000);
        console.log("append txhash i j:", i,j, txhash)
        await utils.waitReceipt(txhash)
    })
    it('inSmgLock', async()=>{
        let typesArray = ['bytes','bytes32','address','uint'];
        let xhash = utils.stringTobytes32("xhash")
        let waddr =  utils.getAddressFromInt(3).addr
        let value = 100;
        let parameters = [EOS, xhash,waddr, value];
        // [ '0x454f53',
        // '0x0000000000000000000000000000000000000000000000000000007868617368',
        // '0x6813eb9362372eef6200f3b1dbc3f819671cba69',
        // 100 ]
      
        // let data = web3.eth.abi.encodeParameters(typesArray, parameters)

        // let s = schnorr.getS(skSmg, typesArray, parameters);
        // console.log("=====s===hex:", s);
        // let r = schnorr.getR()
        // console.log("=====R===hex:",r);

        let htlcProxy = await HTLCProxy.deployed();
        let htlc = await HTLCDelegate.at(htlcProxy.address);
        console.log("htlcProxy.address:", htlcProxy.address)
        let r = "0x042889675e82ca348bc8769ecf0b4533dec112a4531ea4024f15a8b96e154d1447d634f50078cb2003b13fc0324c60798c1eb58954bfcbfcf1293b42959615b686"
        let s = "0x62926fc0009c1d3d854d060dd64ead34573be15c60373dbf3a3d070ae2a01422"

        let locktx = await htlc.inSmgLock(EOS, xhash, waddr, 100, gpk, r,s)   
        console.log("locktx:", locktx); 
        console.log("parameters++++++++++++++++:",parameters)

    })

    it('incentive ', async ()=>{
        let count = await smg.getSelectedSmNumber(id)
        console.log("count :", count)
        console.log("group:",await smg.getGroupInfo(id))

        for(let i=0; i<count; i++){
            let  skAddr = await smg.getSelectedSmInfo(id, i)
            console.log("skAddr:", skAddr)
            while(true){
                let tx = await smg.testIncentiveAll(id,skAddr['0'])
                let rec = await utils.waitReceipt(tx.tx);
                // console.log("rec:",rec.logs[0].topics[3]==1)
                // console.log("rec:",rec.logs[0].topics)
                // console.log("rec:",rec)
                if(rec.logs[0].topics[3]==1){
                    break;
                }
            }
        }



        // for(let i=0; i<count; i++) {
        //     let  = await smg.getSelectedSmInfo(id, i)
        //     console.log("skAddr:", i,skAddr)
        //     while(true){
        //         let tx = await smg.testIncentiveAll(id,skAddr['0'])
        //         let rec = await utils.waitReceipt(tx.tx);
        //         console.log("rec:",rec)
        //     }


        for(let i=0; i<count; i++) {
            let skAddr = await smg.getSelectedSmInfo(id, i)
            console.log("skAddr:", i,skAddr)
                let sk = await smg.getSmInfo(id, skAddr[0]);
                console.log("sk, i:", i, sk)

                let deCount = sk["9"] ;
                for(let k=0; k<deCount; k++) {
                    let deAddr = await smg.getSmDelegatorAddr(id, skAddr[0], k)
                    let de = await smg.getSmDelegatorInfo(id, skAddr[0], deAddr);
                        console.log("de:", k, de)

                    let rc = de["1"];
                    for(let c = 0; c<rc; c++){
                        let r = await smg.getSmDelegatorInfoRecord(id, skAddr[0], deAddr, c)
                        console.log("records", c, r["0"], r["1"])
                    }
                }
            

        }

    })

})
