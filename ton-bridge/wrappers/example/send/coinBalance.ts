import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {Address} from "@ton/core";
import {CoinBalance} from "../../wallet/balance";

let deployer, via;

const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('Addr', 'account address')
    .string(['Addr'])
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

async function main() {
    console.log("Entering main function");
    console.log(process.argv);
    await init();
    //let addr = Address.parse(argv['Addr'])
    let addr = Address.parse('0QCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUGu7')
    let balance = await CoinBalance(client, addr);
    console.log(`balance of ${argv['Addr']} is ${balance}`);
}

main();
// ts-node coinBalance.ts --network testnet --Addr 0QCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUGu7
