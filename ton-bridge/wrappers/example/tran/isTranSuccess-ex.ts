import {toBase64} from "../../utils/utils";

import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getClient, wanTonSdkInit} from "../../client/client";
import {getTransaction} from "../../event/getEvents";
import {isTranSuccess} from "../../transResult/transResult";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAdd', 'contract address')
    .describe('lt', 'logic time')
    .describe('txHash', 'tx hash base64|hexstring')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
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
    try {
        await init();
        let scBridgeAddr = argv['contractAddr'];
        let lt = argv['lt'];
        let tranHash = toBase64(argv['txHash'])

        console.log("scBridgeAddr", scBridgeAddr, "lt", lt, "tranHash", tranHash);
        let tran = await getTransaction(client, scBridgeAddr, lt, tranHash);
        let ret = await isTranSuccess(tran);
        console.log("ret = ", ret);
        client = null;
    } catch (err) {
        console.error(err.code, err.response?.data?.error)
    }

}

main();

// ts-node isTranSuccess-ex.ts --network testnet --contractAddr EQCABVjsQnmRELMK6vjwGbYNRzHXoTd2hvSX6v_VmVrrJNjW --lt 33028013000001 --txHash f0f311fecb1775047c741a25b6b714026cd4336d987a956fa7363ad7bec7cab4