import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID, sleep} from "../../utils/utils";
import {TON_FEE} from "../../fee/fee";

let deployer, via;
const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tpId', 'token pair id')
    .describe('contractFee', 'contractFee')
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


async function setFee() {

    let scAddresses = require(config.contractOutput)
    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    let ret = await ba.writeContract('sendSetTokenPairFee', via, {
        tokenPairID: argv['tpId'],
        fee: Number(argv['contractFee']),
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID: await getQueryID(),
    });
    await sleep(5000)
    let tokenPairFee = await ba.readContract('getTokenPairFee', [argv['tpId']])
    console.log("tokenpairIdFee", argv['tpId'], tokenPairFee);

}

async function main() {
    console.log("Entering main function");
    await init();
    await setFee();
}

main();

// ts-node setTokenPairFee-ex.ts --network testnet --tpId 1032 --contractFee 1001
