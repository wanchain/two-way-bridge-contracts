import {TON_FEE} from "../fee/fee";

import {configTestnet,configMainnet} from "../config/config-ex";
import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {Bridge} from '../Bridge';
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {compileContract, CR, writeCR,doCompile} from "../utils/compileContract";
import fs_1 from "fs";


const prvList = require('../testData/prvlist')
const addressList = require('../testData/addressList')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;
let bridge = null;
let deployerOpened = null;
let bridgeOpened = null;

let deployerValue = TON_FEE.TRANS_FEE_DEPLOY;

import {conf } from "../testData/bridge.compile.func"
let filePath = "../testData/bridge.compiled.json";

async function buildCodeCell(){

    await doCompile(conf,filePath);

    let cr:CR = JSON.parse(fs_1.readFileSync(filePath,'utf-8'));
    return Cell.fromBoc(Buffer.from(cr.codeBase64, "base64"))[0];
}

async function init(){
    await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;

    client = await getClient();
    console.log("client=>",client);
    let code = await buildCodeCell();
    bridge = Bridge.createFromConfig(
        {
            owner: deployer.address,
            halt: 0,
            init: 0,
            smgFeeProxy: smgFeeProxy.address,
            oracleAdmin: oracleAdmin.address,
            operator: oracleAdmin.address,
        },
        code
    )
}
async function main(){
    console.log(prvList);
    console.log(addressList);
    console.log("Entering main function");

    await init();
    bridgeOpened = await client.open(bridge);
    let ret = await bridgeOpened.sendDeploy(await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex')),deployerValue);
    console.log("bridge address :",bridgeOpened.address);
    console.log(ret);
}
main();