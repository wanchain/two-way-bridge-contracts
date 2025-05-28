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
import {SandboxContract, TreasuryContract} from "@ton/sandbox";
import {TON_FEE} from "../../fee/fee";


async function init(){
    await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    client = await getClient();
    console.log("client=>",client);
}

const schnorr = require("../../sign/tools-secp256k1.js");

let tokenInfo = require('../../testData/tokenInfo.json')


async  function setFee(){
    let contractChainFee = toNano('0.01')
    let contractTokenPairFee = toNano('0.02')
    let agentFee = toNano('0.03')

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);

    // set chain fee
    for(let key of Object.keys(tokenInfo)){
        const queryID=await getQueryID();
        let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
        let ret = await ba.writeContract('sendSetChainFee',via,{
            srcChainId:tokenInfo[key].srcChainId,
            dstChainId:tokenInfo[key].dstChainId,
            contractFee:Number(contractChainFee),
            agentFee:Number(agentFee),
            value: TON_FEE.TRANS_FEE_NORMAL,
            queryID,
        });

        ret = await ba.writeContract('sendSetTokenPairFee',via,{
            tokenPairID:tokenInfo[key].tokenPairId,
            fee:Number(contractTokenPairFee),
            value: TON_FEE.TRANS_FEE_NORMAL,
            queryID,
        });

        let tokenPairFee = await ba.readContract('getTokenPairFee',[tokenInfo[key].tokenPairId])
        console.log("tokenpairIdFee",tokenInfo[key].tokenPairId, tokenPairFee);

        let chainFee = await ba.readContract('getChainFee',[tokenInfo[key].srcChainId,tokenInfo[key].dstChainId])
        console.log("chainFee","srcChainId", tokenInfo[key].srcChainId,"desChainId",tokenInfo[key].dstChainId,chainFee);
    }
}

async function main(){
    console.log("Entering main function");
    await init();
    await setFee();
};

main();

// ts-node setFee-ex.ts
