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
const addressList = require('../testData/addressList')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;
let bridge = null;
let deployerOpened = null;
let bridgeOpened = null;

let deployerValue = toNano('0.05');

const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";

async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient('testnet');
    console.log("client=>",client);
}

let tokenPairId3 = tokenInfo.coin.tokenPairId;
tokenInfo.coin.dstTokenAcc = TON_COIN_ACCOUT;

async function getTokenPair(){
    // read contract
    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    console.log("bridgeAddess =>",scAddresses.bridgeAddress);
    let ret = await ba.readContract('getTokenPair',[tokenPairId3])
    console.log("getTokenPair=>", ret);
}

async function main(){
    console.log("Entering main function");
    await init();
    await getTokenPair();
};

main();