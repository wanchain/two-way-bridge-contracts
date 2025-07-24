import {configMainnetNoDb, configTestnetNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {Address, beginCell, SendMode, toNano} from "@ton/core";
import {sleep} from "../../utils/utils";
import {CoinBalance} from "../../wallet/balance";


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
    .describe('gas', 'gas')
    .describe('round', 'round')
    .string(['contractAddr', 'start', 'gas'])
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

async function buildInsertData(start: number, count: number) {
    // let start = BigInt(argv['start']);
    // let count = BigInt(argv['count']);
    let c = beginCell()
        .storeUint(0x12345678, 32)
        .storeUint(BigInt(start), 64)
        .storeUint(BigInt(count), 64)
        .endCell();
    return c;
}


async function insert(start: number, count: number) {
    let provider = await client.provider(Address.parse(argv['contractAddr']));
    let ret = await provider.internal(via, {
        value: toNano(argv['gas']),
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: await buildInsertData(start, count),
        bounce: true,
    });
    console.log("start", start, "count", count);
    console.log("ret", ret)
}

async function main() {
    console.log('argv', argv);
    console.log("Entering main function");
    await init();


    let count = parseInt(argv['count']);
    let round = parseInt(argv['round']);
    let start = Math.floor(Date.now());
    let stepForStart = count;
    for (let i = 0; i < round && count > 0; i++) {
        let balance = await CoinBalance(client, deployer.address);
        if (BigInt(toNano(argv['gas']) > BigInt(toNano(balance.toString())))) {
            console.log("insufficent ton");
            return;
        }
        start += stepForStart; // fix already input error.
        count -= 1;   // fee increasing so need decrease count.
        await insert(start, count);
        await sleep(10000);
    }
}

main();

// ts-node insert-bigData-ex.ts --network testnet --contractAddr kQDdJdmdRDSbsaAt9M7GAEIoptohjfrNv7lK5zPgik7jUnY6 --count 150 --round 2 --gas 2
