import {TON_FEE} from "../../fee/fee";

import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name')
    .describe('tpId', 'tokenPairId')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');
console.log("config=>", config);


const prvList = require('../../testData/prvlist.json')

let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null;
let client = null;

const scAddresses = require('../../testData/contractAddress.json');

let queryID;

async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnet);
    }

    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient();
    //console.log("client=>", typeof(client));
    queryID = await getQueryID();

}

async function addTokenPair() {
    const tpId = argv["tpId"];
    console.log("tpId = ", tpId);
    let scAddresses = require(config.contractOutput);
    console.log("scAddresses=>", scAddresses);
    const tokenPairs = require(config.tokenpairInput);
    console.log("tokenPairs=>", tokenPairs);
    const tokenPair = tokenPairs[tpId];

    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID,
        tokenPairId: tokenPair.tokenPairId,
        fromChainID: tokenPair.srcChainId,
        fromAccount: tokenPair.srcTokenAcc,
        toChainID: tokenPair.dstChainId,
        toAccount: tokenPair.dstTokenAcc,
        //jettonAdminAddr: TON_COIN_ACCOUNT_STR,    // cancel because original token and wrapped token has same logic.
        walletCodeBase64: tokenPair.walletCodeBase64,
    }
    console.log("opt=>", opt);
    let via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    let ret = await ba.writeContract('sendAddTokenPair', via, opt);
    console.log("sendAddTokenPair", ret);
}

async function main() {
    console.log("Entering main function");
    await init();
    await addTokenPair();
}

main();

// ts-node addTokenPair1-ex.ts --network testnet --tpId 1030
// ts-node addTokenPair-ex.ts wan
// ts-node addTokenPair-ex.ts usdt