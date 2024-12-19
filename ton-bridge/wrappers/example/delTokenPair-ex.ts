global.TON_NETORK = "testnet";
import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID} from '../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient} from "../client/client";

let tokenInfo = {
    tokenOrg:{tokenPairId:0x01,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    tokenWrapped:{tokenPairId:0x02,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    coin:{tokenPairId:0x03,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:''},
}

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
    client = await getClient();
    console.log("client=>",client);
    queryID = await getQueryID();
}


let tokenPairId3 = tokenInfo.coin.tokenPairId;
tokenInfo.coin.dstTokenAcc = TON_COIN_ACCOUT;

async function removeTokenPair(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: toNano('0.005'),
        queryID,
        tokenPairId: tokenPairId3,
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