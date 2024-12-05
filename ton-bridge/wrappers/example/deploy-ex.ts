import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {Bridge, TON_COIN_ACCOUT, BIP44_CHAINID} from '../Bridge';
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient} from "../client/client";
import {compileContract, CR, writeCR} from "../utils/compileContract";
import fs_1 from "fs";

const prvList = require('../testData/prvlist')
const addressList = require('../testData/addressList')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;
let bridge = null;
let deployerOpened = null;
let bridgeOpened = null;

let deployerValue = toNano('0.05');

async function buildCodeCell(){
    let filePath = "../testData/bridge.compiled.json";

    let cr:CR = JSON.parse(fs_1.readFileSync(filePath,'utf-8'));
    return Cell.fromBoc(Buffer.from(cr.codeBase64, "base64"))[0];
}

async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;

    client = await getClient('testnet');
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