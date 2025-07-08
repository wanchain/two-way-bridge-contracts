import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {Address} from "@ton/core";
import {TokenBalance} from "../../wallet/balance";

let deployer, via;

const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'token account')
    .describe('Addr', 'account address')
    .string(['Addr', 'tokenAddr'])
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
    let addr = Address.parse(argv['Addr'])
    let tokenAddr = Address.parse(argv['tokenAddr'])
    //let addr = Address.parse('0QCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUGu7')
    let balance = await TokenBalance(client, tokenAddr, addr);
    console.log(`balance of ${argv['Addr']} is ${balance}`);
}

main();

//ts-node tokenBalance.ts --network testnet --tokenAddr EQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK_f9 --Addr 0QALz9kOW8wETujt9zDgLCaEfevg3PU6sljgead4op81Jixq

