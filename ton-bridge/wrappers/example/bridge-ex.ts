import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge, TON_COIN_ACCOUT,BIP44_CHAINID} from '../Bridge';
import {compile} from '@ton/blueprint';
import {JettonMinter} from "../JettonMinter";
import {JettonWallet} from "../JettonWallet";

import {BufferrToHexString, HexStringToBuffer} from "../utils/utils";
import { computeHash } from '../sign/buildHash';
import {CR} from "../utils/compileContract";
import fs_1 from "fs";
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient} from "../client/client";

const schnorr = require('../sign/tools-secp256k1.js');

function AccountToBig(addr: Address) {
    return BigInt("0x" + addr.hash.toString('hex'));
};


const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
const gpk = schnorr.getPKBySk(skSmg);
const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X")? gpk.substring(0,66): `0x${gpk.substring(0,64)}`;
const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X")? `0x${gpk.substring(66)}`: `0x${gpk.substring(64)}`;
const smgId = "0x000000000000000000000000000000000000000000746573746e65745f303638";

const wkDuring = 1000; // seconds


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

async function main(){


    let beforeAll = async () => {
        // 3.3 add token pair for ton-coin
        let queryID = 1;
        let tokenPairId3 = tokenInfo.coin.tokenPairId;
        let srcChainId3 = tokenInfo.coin.srcChainId;
        let dstChainId3 = tokenInfo.coin.dstChainId;
        let srcTokenAcc3 = tokenInfo.coin.srcTokenAcc;
        let dstTokenAcc3 = TON_COIN_ACCOUT;
        tokenInfo.coin.dstTokenAcc = TON_COIN_ACCOUT;

        // read contract
        let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
        console.log("bridgeAddess =>",scAddresses.bridgeAddress);
        let retOld3 = await ba.readContract('getTokenPair',[tokenPairId3])
        console.log("retOld3", retOld3);

        /*

        // write contract
        let opt = {
            value: toNano('0.005'),
            queryID,
            tokenPairId: tokenPairId3,
            fromChainID: srcChainId3,
            fromAccount: srcTokenAcc3,
            toChainID: dstChainId3,
            toAccount: dstTokenAcc3,
        }
        let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
        let ret3 = await ba.writeContract('sendAddTokenPair',via,opt);
        console.log("ret3",ret3);

        // get contract
        let ret4 = await ba.readContract('getTokenPair',[tokenPairId3])
        console.log("ret4", ret4);*/

    }

    await init();
    await beforeAll();

    console.log("Entering main function");

};

main();