import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {Address} from '@ton/core';
import {getClient, wanTonSdkInit} from "../../client/client";
import {WanTonClient} from "../../client/client-interface";
import {getJettonWalletAddr} from "../../code/userLock";

const prvList = require('../../testData/prvlist')
const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'token address')
    .describe('addr', 'owner address')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 2) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

let client = null;

async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
}

async function getJwAddr(client: WanTonClient, tokenAddr: Address, addr: Address) {
    let ret = await getJettonWalletAddr(client, tokenAddr, addr);
    return ret.toString();
}

async function main() {
    console.log("Entering main function");
    await init();
    let ret = await getJwAddr(client, Address.parse(argv['tokenAddr']), Address.parse(argv['addr']));
    console.log("ret=", ret);
}

main();

// ts-node getJwAddr-ex.ts --network testnet --tokenAddr EQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v1eF  --addr EQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE24h
// ts-node getJwAddr-ex.ts --network testnet --tokenAddr kQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v-wP  --addr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr