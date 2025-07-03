import {toBase64} from "../../utils/utils";

import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {getClient, wanTonSdkInit} from "../../client/client";
import {getTransaction} from "../../event/getEvents";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAdd', 'contract address')
    .describe('lt', 'logic time')
    .describe('txHash', 'tx hash base64 or hex')
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

        console.log("contractAddr", scBridgeAddr, "lt", lt, "tranHash", tranHash);
        let ret = await getTransaction(client, scBridgeAddr, lt, tranHash);
        console.log("ret = ", ret);
        client = null;
    } catch (err) {
        console.error(err.code, err.response?.data?.error)
    }

}

main();

// mainnet
// ts-node getTransaction-ex.ts --network mainnet --contractAddr EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs --lt 56510003000001 --txHash fEULm54qtjiWNCWgqPuik7rnVg8TxFjgrEwkaGIeqAw=

// testnet
// ts-node getTransaction-ex.ts --network testnet --contractAddr  kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr --lt 33028010000001 --txHash 61ec9d0be00c8f65a8e84b1a13121d8fbd826cf7777f856bc5f72381bf6b2257
