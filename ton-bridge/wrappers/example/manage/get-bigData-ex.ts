import {configMainnetNoDb, configTestnetNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {Address} from "@ton/core";


let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null, via = null, foundation = null;

const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAddr', 'contractAddr')
    .describe('count', 'count')
    .describe('start', 'start index')
    .string(['contractAddr', 'start'])
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
        //await wanTonSdkInit(configTestTonApiNoDb);
        await wanTonSdkInit(configTestnetNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    foundation = deployer;
}

async function getData() {
    let provider = await client.provider(Address.parse(argv['contractAddr']));
    let ret = await provider.get('get_by_id', [{type: 'int', value: BigInt(argv['index'])}]);
    console.log("ret", ret.stack.readNumber())
}

async function main() {
    console.log('argv', argv);
    console.log("Entering main function");
    await init();
    await getData();
}

main();

// ts-node get-bigData-ex.ts --network testnet --contractAddr EQAAeX2OX6WNC5cF7UX5NIyU8RbllnZOK86T8Uzhn6qttMs2 --index 2
