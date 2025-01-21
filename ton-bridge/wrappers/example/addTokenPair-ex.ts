const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID,TON_COIN_ACCOUNT_STR,BIP44_WANCHAIN_CHAINID} from '../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig} from "../client/client";

let tokenType = "coin";

const tokenInfo = require('../testData/tokenInfo.js')

const prvList = require('../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;

const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";
import {getQueryID} from "../utils/utils";

let queryID;

async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient(config);
    console.log("client=>",client);
    queryID = await getQueryID();
}

async function addTokenPair(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: toNano('0.05'),
        queryID,
        tokenPairId: tokenInfo[tokenType].tokenPairId,
        fromChainID: tokenInfo[tokenType].srcChainId,
        fromAccount: tokenInfo[tokenType].srcTokenAcc,
        toChainID: tokenInfo[tokenType].dstChainId,
        toAccount: tokenInfo[tokenType].dstTokenAcc,
        jettonAdminAddr:TON_COIN_ACCOUNT_STR,
    }
    console.log("opt=>",opt);
    let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    let ret = await ba.writeContract('sendAddTokenPair',via,opt);
    console.log("sendAddTokenPair",ret);
}
async function main(){
    console.log("Entering main function");
    await init();
    await addTokenPair();
};

main();