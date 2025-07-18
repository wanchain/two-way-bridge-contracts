import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getWalletStatus} from "../../wallet/walletContract";
import {WanTonClient} from "../../client/client-interface";

let deployer, via;

const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('Addr', 'account address')
    .string(['Addr'])
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

async function getStatus(client: WanTonClient, address: string) {
    return await getWalletStatus(client, address);
}

async function main() {
    console.log("Entering main function");
    console.log(process.argv);
    await init();
    let ret = await getStatus(client, argv['Addr']);
    console.log("wallet status:", "address", argv['Addr'], "status", ret);
}

main();
// ts-node getWalletStatus.ts --network testnet --Addr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr
