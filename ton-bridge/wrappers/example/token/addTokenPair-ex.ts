import {TON_FEE} from "../../fee/fee";

import {configTestnet, configMainnet, configTestTonApiNoDb} from "../../config/config-ex";

import {TON_COIN_ACCOUT, BIP44_CHAINID,TON_COIN_ACCOUNT_STR,BIP44_WANCHAIN_CHAINID} from '../../const/const-value';

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";

const args = process.argv.slice(2);
//let tokenType = "coin";
let tokenType = args[0];

let jettonTokenInfo = require('../../testData/jettonTokenInfo.json');
let tokenInfo = require('../../testData/tokenInfo.json')

const prvList = require('../../testData/prvlist.json')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;

const scAddresses = require('../../testData/contractAddress.json');
import { BridgeAccess } from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";

let queryID;

async function init(){
    //await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestTonApiNoDb);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient();
    //console.log("client=>", typeof(client));
    queryID = await getQueryID();

}

async function addTokenPair(){

    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID,
        tokenPairId: tokenInfo[tokenType].tokenPairId,
        fromChainID: tokenInfo[tokenType].srcChainId,
        fromAccount: tokenInfo[tokenType].srcTokenAcc,
        toChainID: tokenInfo[tokenType].dstChainId,
        toAccount: tokenInfo[tokenType].dstTokenAcc,
        jettonAdminAddr:TON_COIN_ACCOUNT_STR,    //todo check jettonAddr
        walletCodeBase64:tokenInfo[tokenType].walletCodeBase64,
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

// ts-node addTokenPair-ex.ts ton
// ts-node addTokenPair-ex.ts wan
// ts-node addTokenPair-ex.ts usdt