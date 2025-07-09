import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";
import {TON_FEE} from "../../fee/fee";


const smgCfg = require('../../testData/smg.json');

const args = process.argv.slice(2);
const prvList = require('../../testData/prvlist')

let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null;


const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('commited', 'commited or prepare')
    .boolean('commited')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 2) {
    optimist.showHelp();
    process.exit(0);
}

global.network = argv["network"];
const config = require('../../config/config');
const scAddresses = require(config.contractOutput);


let client = null;


async function init() {

    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
}


const schnorr = require("../../sign/tools-secp256k1.js");

async function addSmg() {

    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    const skSmg = Buffer.from(smgCfg.skSmg, 'hex');
    console.log("skSmg=>", skSmg);
    const gpk = schnorr.getPKBySk(skSmg);

    console.log("gpk=>", gpk);
    const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X") ? gpk.substring(0, 66) : `0x${gpk.substring(0, 64)}`;
    const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X") ? `0x${gpk.substring(66)}` : `0x${gpk.substring(64)}`;
    const smgId = smgCfg.smgId;
    console.log("gpkX=>", gpkX)
    console.log("gpkY=>", gpkY)
    let startTime = Math.floor(Date.now() / 1000);
    let endTime = startTime + smgCfg.wkDuring;

    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        id: BigInt(smgId),
        gpkX: BigInt(gpkX), gpkY: BigInt(gpkY),
        startTime,
        endTime,
        queryID: await getQueryID(),
    }
    console.log("opt=>", opt);
    let via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    if (!argv['commited']) {
        let ret = await ba.writeContract('sendSetStoremanGroupConfig', via, opt);
        console.log("sendSetStoremanGroupConfig", ret);

        let retGetSmg = await ba.readContract('getStoremanGroupConfig', [BigInt(smgId)]);
        console.log("retGetSmg", retGetSmg);
    } else {
        let ret = await ba.writeContract('sendSetStoremanGroupConfigCommit', via, opt);
        console.log("sendSetStoremanGroupConfigCommit", ret);

        let retGetSmg = await ba.readContract('getStoremanGroupConfigCommited', [BigInt(smgId)]);
        console.log("retGetSmg commited", retGetSmg);
    }
}

async function main() {
    console.log("Entering main function");
    await init();
    await addSmg();
}

main();

// only for testnet ,  and only for test (fake gpk)
// ts-node addSmg-ex.ts --network testnet
