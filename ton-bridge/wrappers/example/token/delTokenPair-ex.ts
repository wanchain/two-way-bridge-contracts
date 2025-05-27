import {TON_FEE} from "../fee/fee";

import {configTestnet,configMainnet} from "../config/config-ex";

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID} from '../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";


const args = process.argv.slice(2);
let tokenPairId = args[0];

const prvList = require('../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;
const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";
import {getQueryID} from "../utils/utils";

let queryID;
async function init(){
    await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient();
    console.log("client=>",client);
    queryID = await getQueryID();
}

async function removeTokenPair(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID,
        tokenPairId,
    }
    console.log("opt=>",opt);
    let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    let ret3 = await ba.writeContract('sendRemoveTokenPair',via,opt);
    console.log("sendRemoveTokenPair",ret3);
}

async function main(){
    console.log("Entering main function");
    await init();
    await removeTokenPair();
};

main();

// ts-node delTokenPair-ex.ts 941
// ts-node delTokenPair-ex.ts 939
// ts-node delTokenPair-ex.ts 940