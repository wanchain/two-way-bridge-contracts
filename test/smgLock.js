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

    let gpk = '0x04a4a90e6b3914780a66e3d34134478ffe455b657705d9c71bf48f66b52e486ed8362d850558f152ff03a5210a63625438cbaa9cb924bd90d597299cf9c3bcbe70';
    let skSmg ='0x000000000000000000000000000000000000000000000000000000000000270f'
    console.log("gpk:",schnorr.getPKBySk(skSmg))

    let htlc;
    before("init contracts", async() => {
        let htlcProxy_address = "0x1dBEffEDbc8C349a53E6c18ec0521A27d6e9D085"; 
        htlc = await HTLCDelegate.at(htlcProxy_address);
    })
    it("lock", async ()=>{
        let xhash = utils.stringTobytes32("xhash")
        let waddr =  utils.getAddressFromInt(3).addr
        let typesArray = ['bytes','bytes32','address','uint'];
        let parameters = [EOS, xhash, waddr, 100];
    
   
        let s = schnorr.getS(skSmg, typesArray, parameters);
        console.log("=====s===hex:", s);
        let r = schnorr.getR()
        console.log("=====R===hex:",r);


        let locktx = await htlc.inSmgLock(EOS, xhash, waddr, 100, gpk, r,s)   
        console.log("locktx:", locktx); 
    })
})

