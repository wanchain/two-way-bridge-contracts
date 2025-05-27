import {configTestnet,configMainnet} from "../config/config-ex";

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID,TON_COIN_ACCOUNT_STR,BIP44_WANCHAIN_CHAINID} from '../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";

const smgCfg = require('../testData/smg.json');

const args = process.argv.slice(2);
const prvList = require('../testData/prvlist')

let deployer =null,feeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;

const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";
import {getQueryID, sleep} from "../utils/utils";
import {SandboxContract, TreasuryContract} from "@ton/sandbox";
import {TON_FEE} from "../fee/fee";


async function init(){
    await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    client = await getClient();
    console.log("client=>",client);

    feeProxy = await getWalletByPrvKey(Buffer.from(prvList[4],'hex'));
}

const schnorr = require("../sign/tools-secp256k1.js");

let tokenInfo = require('../testData/tokenInfo.json')

const setFeeGasValue =  TON_FEE.TRANS_FEE_NORMAL

async  function setFeeProxy(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);

    // set chain fee

        const queryID=await getQueryID();
        let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
        let ret = await ba.writeContract('sendSetFeeProxy',via,{
            feeProxy:feeProxy.address, // EQAqx2ITzIiFmFdXx4DNsGo5jr0Ju7Q3pL9X_qzK11klOsEx
            value: setFeeGasValue,
            queryID,
        });

        await sleep(3000)
        let configInfo = await ba.readContract('getCrossConfig',[]);
        console.log("configInfo",configInfo);

}

async function main(){
    console.log("Entering main function");
    await init();
    await setFeeProxy();
};

main();

// ts-node setFeeProxy.ts
