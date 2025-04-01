import {slimSndMsgResult} from "../../tests/transaction";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';

import {Bridge} from '../Bridge';
import {TON_COIN_ACCOUT, BIP44_CHAINID,TON_COIN_ACCOUNT_STR,BIP44_WANCHAIN_CHAINID} from '../const/const-value';

import {getSenderByPrvKey, getTonAddrByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig} from "../client/client";

const smgCfg = require('../testData/smg.json');

const args = process.argv.slice(2);
let tokenType = args[0];
let amount = args[1];
const prvList = require('../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let alicePrv,bobPrv = null;
let aliceAddr:Address
let bobAddr :Address
let aliceWallet, bobWallet;
let client = null;

const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";
import {getQueryID} from "../utils/utils";


let contractProvider =null;
async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    aliceWallet = await getWalletByPrvKey(Buffer.from(prvList[1],'hex'));
    bobWallet = await getWalletByPrvKey(Buffer.from(prvList[2],'hex'));

    aliceAddr = aliceWallet.address;
    bobAddr = bobWallet.address;

    client = await getClient(config);
    console.log("client=>",client);
}

const schnorr = require("../sign/tools-secp256k1.js");

let tokenInfo = require('../testData/tokenInfo.json')

import{JettonMinter} from "../JettonMinter";
import{JettonWallet} from "../JettonWallet";
import {CoinBalance,TokenBalance} from "../wallet/balance";
import {TonClient} from "@ton/ton";
import {TON_FEE} from "../fee/fee";


async function mintToken(client:TonClient,tokenType: string, to: Address, amount: bigint) {
    let jettonTokenAddr = tokenInfo[tokenType].dstTokenAcc
    console.log("tokenAddress = %s, tokenType = %s,to= %s,amount=%d",jettonTokenAddr,tokenType,to.toString(),amount)
    console.log("before mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client, Address.parse(jettonTokenAddr), to));
    let via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));


    let jettonMinter = JettonMinter.createFromAddress(jettonTokenAddr);
    let contractProvider = client.provider(jettonTokenAddr);

    let mintResult = await jettonMinter.sendMint(contractProvider, via, to, amount, TON_FEE.FWD_FEE_MINT_JETTON, TON_FEE.TOTAL_FEE_MINT_JETTON)
    console.log("mintResult",mintResult);
    console.log("after mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client, Address.parse(jettonTokenAddr), to));

}

async function main(){
    console.log("Entering main function");
    await init();
    await mintToken(client,tokenType,aliceAddr,toNano(amount));
    await mintToken(client,tokenType,bobAddr,toNano(amount));
};

main();

// ts-node mintToken-ex.ts tokenWrapped  1.0
// ts-node mintToken-ex.ts tokenOrg     1.0
