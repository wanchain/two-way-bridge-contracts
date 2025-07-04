import {getClient, wanTonSdkInit} from "../../client/client";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {toNano} from "@ton/core";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {sleep, toNumberByDecimal} from "../../utils/utils";

import {configMainnetNoDb, configTestnetNoDb} from "../../config/config-ex";

const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tpId', 'token pair Id')
    .describe('lockValue', 'lockValue')
    .describe('decimal', 'decimal of the lock token or coin')
    .describe('smgId', 'storeman group Id')
    .describe('destAddr', 'address of non-ton address')
    .string(['destAddr', 'smgId'])
    .argv;

console.log(optimist.argv);
console.log("smgId", argv['smgId']);
console.log("destAddr", argv['destAddr']);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 6) {
    optimist.showHelp();
    process.exit(0);
}

global.network = argv["network"];
const config = require('../../config/config');

let client = null;

const scAddresses = require(config.contractOutput);

let crossValue = toNumberByDecimal(argv['lockValue'], argv['decimal'])
let bridgeScAddr = scAddresses.bridgeAddress
let transValueUserLock = toNano('1')
let aliceSender;

let aliceWallet, aliceAddress;

async function init() {

    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestnetNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    aliceWallet = await getWalletByPrvKey(Buffer.from(prvList[1], 'hex'));
    aliceAddress = aliceWallet.address.toString();
    aliceSender = await getSenderByPrvKey(client, Buffer.from(prvList[1], 'hex'));
}

async function userLock() {
    console.log("Entering userLock..");
    try {
        let transValue: bigint = transValueUserLock;
        let ba = BridgeAccess.create(client, bridgeScAddr);

        let ret = await ba.writeContract('sendUserLock', aliceSender, {
            value: transValue,
            smgID: argv['smgId'],
            tokenPairID: argv['tpId'],
            crossValue,
            dstUserAccount: argv['destAddr'],
            bridgeScAddr,
            client,
            senderAccount: aliceAddress
        })
        await sleep(3000);
        console.log("ret of userLock is %s", ret);

    } catch (e) {
        console.log("err  =%s", e.Error);
        console.log("err(detailed):", e);
    }
}

async function main() {

    await init();
    await userLock();

}

main();

// ts-node userLock-ex.ts --network testnet --tpId 1032 --lockValue 0.01 --decimal 9 --smgId 0x000000000000000000000000000000000000000000746573746e65745f303638 --destAddr 0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9

// ts-node userLock-ex.ts --network testnet --tpId 1030 --lockValue 100 --decimal 6 --smgId 0x000000000000000000000000000000000000000000746573746e65745f303638 --destAddr 0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9
