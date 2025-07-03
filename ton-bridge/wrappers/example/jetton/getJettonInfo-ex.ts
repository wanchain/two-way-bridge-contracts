import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {Address} from '@ton/core';
import {getJettonData, getJettonDataContent, parseWrappedJettonContent} from "../../wallet/jetton";
import {getClient, wanTonSdkInit} from "../../client/client";
import {WanTonClient} from "../../client/client-interface";

const prvList = require('../../testData/prvlist')
const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'token address')
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

async function DisplayJettonInfo(client: WanTonClient, addr: Address) {
    let ret = await getJettonData(client, addr);
    console.log("getJettonData=>", ret)

    let retJettonContent = await getJettonDataContent(client, addr);
    console.log("getJettonDataContent=>", await parseWrappedJettonContent(retJettonContent));
}

async function main() {
    console.log("Entering main function");
    await init();
    await DisplayJettonInfo(client, Address.parse(argv['tokenAddr']));
}

main();

// ts-node getJettonInfo-ex.ts --network testnet --tokenAddr EQB7MS_HPERUy7btkQlbgn3L4GQN_eqoev_D3jv6DvH9OxqL
