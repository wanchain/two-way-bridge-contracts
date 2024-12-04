import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge, TON_COIN_ACCOUT, BIP44_CHAINID} from '../Bridge';
import {compile} from '@ton/blueprint';
import {JettonMinter} from "../JettonMinter";
import {JettonWallet} from "../JettonWallet";

import {BufferrToHexString, HexStringToBuffer} from "../utils/utils";
import {computeHash} from '../sign/buildHash';
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient} from "../client/client";
import {compileContract, CR, writeCR} from "../utils/compileContract";
import fs_1 from "fs";
import {build} from "@ton/blueprint/dist/cli/build";

const schnorr = require('../sign/tools-secp256k1.js');

function AccountToBig(addr: Address) {
    return BigInt("0x" + addr.hash.toString('hex'));
};


const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
const gpk = schnorr.getPKBySk(skSmg);
const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X") ? gpk.substring(0, 66) : `0x${gpk.substring(0, 64)}`;
const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X") ? `0x${gpk.substring(66)}` : `0x${gpk.substring(64)}`;
const smgId = "0x000000000000000000000000000000000000000000746573746e65745f303638";

const wkDuring = 1000; // seconds

let tokenInfo = {
    tokenOrg: {
        tokenPairId: 0x01,
        srcChainId: 0x1234,
        dstChainId: BIP44_CHAINID,
        srcTokenAcc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        dstTokenAcc: '',
    },
    tokenWrapped: {
        tokenPairId: 0x02,
        srcChainId: 0x1234,
        dstChainId: BIP44_CHAINID,
        srcTokenAcc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        dstTokenAcc: '',
    },
    coin: {
        tokenPairId: 0x03,
        srcChainId: 0x1234,
        dstChainId: BIP44_CHAINID,
        srcTokenAcc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        dstTokenAcc: ''
    },
}

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
            robotAdmin: oracleAdmin.address,
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