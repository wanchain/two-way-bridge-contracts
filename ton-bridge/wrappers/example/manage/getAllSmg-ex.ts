import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {sleep} from "@ton/blueprint";


let deployer, via;
const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('commited', 'commited or pre commited')
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

let client = null;

async function init() {

    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
}

async function getAllSmg() {
    console.log("config.contractOutput", config.contractOutput);
    const scAddresses = require('../../testData/contractAddress.json');
    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    let smgId = BigInt(0);
    if (argv['commited']) {
        smgId = await ba.readContract('getFirstStoremanGroupIDCommited', [])
    } else {
        smgId = await ba.readContract('getFirstStoremanGroupID', [])
    }

    while (BigInt(0) != BigInt(smgId)) {
        let retGetSmg = null;
        if (argv['commited']) {
            retGetSmg = await ba.readContract('getStoremanGroupConfigCommited', [BigInt(smgId)]);
        } else {
            retGetSmg = await ba.readContract('getStoremanGroupConfig', [BigInt(smgId)]);
        }
        console.log("retGetSmg", "smgId", smgId, "smgInfo", retGetSmg);

        if (argv['commited']) {
            smgId = await ba.readContract('getNextStoremanGroupIDCommited', [BigInt(smgId)]);
        } else {
            smgId = await ba.readContract('getNextStoremanGroupID', [BigInt(smgId)]);
        }
        await sleep(2000)
    }
}

async function main() {
    console.log("Entering main function");
    await init();
    await getAllSmg();
}

main();

// only for testnet ,  and only for test (fake gpk)
// ts-node getAllSmg-ex.ts --network testnet --commited
