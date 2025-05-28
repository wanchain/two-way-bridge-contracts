import {configTestnet,configMainnet} from "../../config/config-ex";

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID,TON_COIN_ACCOUNT_STR,BIP44_WANCHAIN_CHAINID} from '../../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";


const smgCfg = require('../../testData/smg.json');

const args = process.argv.slice(2);
const prvList = require('../../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;

const scAddresses = require('../../testData/contractAddress.json');
import { BridgeAccess } from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";
import { TON_FEE } from "../../fee/fee";


async function init(){
    await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    client = await getClient();
    console.log("client=>",client);
}

const schnorr = require("../../sign/tools-secp256k1.js");

async function addSmg(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    const skSmg = Buffer.from(smgCfg.skSmg, 'hex');
    console.log("skSmg=>",skSmg);
    const gpk = schnorr.getPKBySk(skSmg);

    console.log("gpk=>",gpk);
    const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X")? gpk.substring(0,66): `0x${gpk.substring(0,64)}`;
    const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X")? `0x${gpk.substring(66)}`: `0x${gpk.substring(64)}`;
    const smgId = smgCfg.smgId;
    console.log("gpkX=>",gpkX)
    console.log("gpkY=>",gpkY)
    let startTime = Math.floor(Date.now() / 1000);
    let endTime = startTime + smgCfg.wkDuring;

    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        id: BigInt(smgId),
        gpkX:BigInt(gpkX), gpkY:BigInt(gpkY),
        startTime,
        endTime,
        queryID: await getQueryID(),
    }
    console.log("opt=>",opt);
    let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    let ret = await ba.writeContract('sendSetStoremanGroupConfig',via,opt);
    console.log("sendSetStoremanGroupConfig",ret);

    let retGetSmg = await ba.readContract('getStoremanGroupConfig',[BigInt(smgId)]);
    console.log("retGetSmg",retGetSmg);

}
async function main(){
    console.log("Entering main function");
    await init();
    await addSmg();
};

main();

// ts-node addSmg-ex.ts
