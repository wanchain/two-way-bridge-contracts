const utils = require("./utils");
const schnorr = require('../utils/schnorr/tools.js');


const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const Secp256k1 = artifacts.require('Secp256k1');
const SchnorrVerifier = artifacts.require('SchnorrVerifier');
const QuotaLib = artifacts.require('QuotaLib');
const HTLCLib = artifacts.require('HTLCLib');
const HTLCDebtLib = artifacts.require('HTLCDebtLib');
const HTLCSmgLib = artifacts.require('HTLCSmgLib');
const HTLCUserLib = artifacts.require('HTLCUserLib');
const HTLCProxy = artifacts.require('HTLCProxy');
const HTLCDelegate = artifacts.require('HTLCDelegate');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const TestSmg = artifacts.require('TestSmg');

const MetricProxy     = artifacts.require('MetricProxy');
const MetricDelegate  = artifacts.require('MetricDelegate');

const CreateGpkProxy  = artifacts.require('CreateGpkProxy');
const CreateGpkDelegate = artifacts.require('CreateGpkDelegate');


contract('TestSmg', async (accounts) => {
    let EOS = utils.stringTobytes("EOS")
    
    let gaddr = '0xf223ebd621fc35417023fdc52d3cc55de672e6de'
    let gpk = '0x7793ef5f8e57e872ea9fbb18bd710ab96ea4f646134d3308930cbf62e73f0e1c8d5b3b793573090fa4a7e7e5c38fd987e889bc3e720e05b243e856f632ae7cc5'
    let skSmg ='000000000000000000000000000000000000000000000000000000000000270f'

    let htlc;
    before("init contracts", async() => {
        let htlcProxy_address = "0x4a697A4FeFf854d9b39D5E2e81A6568997770453"; 
        htlc = await HTLCDelegate.at(htlcProxy_address);
    })
    it("lock", async ()=>{
        let xhash = utils.stringTobytes32("xhash")
        let typesArray = ['bytes','bytes32','address','uint256'];
        let parameters = [EOS, xhash, waddr, 100];
    
   
        let s = schnorr.getS(skSmg, typesArray, parameters);
        console.log("=====s===hex:", s);
        let r = schnorr.getR()
        console.log("=====R===hex:",r);


        let locktx = await htlc.inSmgLock(EOS, xhash, waddr, 100, gpk, r,s)   
        console.log("locktx:", locktx); 
    })
})

