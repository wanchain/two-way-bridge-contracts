import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {newWallet} from "../../wallet/walletContract";

let deployer, via;

const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 1) {
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

async function newTonWallet() {
    return newWallet();
}

async function main() {
    console.log("Entering main function");
    console.log(process.argv);
    await init();

    let w = await newTonWallet();
    console.log("wallet created:", w);
}

main();
// ts-node newWallet.ts
