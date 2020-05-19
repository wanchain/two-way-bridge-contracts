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
    let gaddr = '0xdfa84795344a019a2f13289789dbb74cb1a77065'
    let gpk = '0x4da190ee5cde629aa0b95f82930d8d1540c648d93e1ce99a361d422b97437a40145f13cbe6d061ff93f226ea97786d4d66c0a3779479f3d10425e4e3f2aa11bb'
    let skSmg ='0x000000000000000000000000000000000000000000000000000000000f270000'
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

