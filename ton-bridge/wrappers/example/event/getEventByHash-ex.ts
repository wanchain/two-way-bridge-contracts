import {configMainnet, configTestTonApi} from "../../config/config-ex";
import {getClient, wanTonSdkInit} from "../../client/client";
import {getEventByTranHash} from "../../event/getEvents";
import {IsWanTonClient} from "../../client/client-interface";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAddr', 'contractAddr')
    .describe('lt', 'logical time')
    .describe('hash', 'transaction hash')
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
        await wanTonSdkInit(configTestTonApi);
    } else {
        await wanTonSdkInit(configMainnet);
    }

    client = await getClient();
}

async function getEventByHash() {
    try {
        let scBridgeAddr = argv['contractAddr'];
        let lt = argv['lt'];
        let tranHash = Buffer.from(argv['hash'], 'hex').toString('base64');

        console.log("scBridgeAddr", scBridgeAddr, "lt", lt, "tranHash", tranHash);
        console.log("before getEventByTranHash", "client is WanTonClient", IsWanTonClient(client));
        let ret = await getEventByTranHash(client, scBridgeAddr, lt, tranHash);

        console.log("ret = ", ret);
        client = null;
    } catch (err) {
        console.error(err.code, err.response?.data?.error)
    }
}

async function main() {
    await init();
    await getEventByHash();

}

main();
// userLock
// ts-node getEventByHash-ex.ts --network testnet --contractAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr --lt 33313072000003 --hash 5c6cbcef28ef2514ea0b7594a0dda35e4ce08416312d3c5629388ae21ad54e83


// smgRelease
// ts-node getEventByHash-ex.ts --network testnet --contractAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr --lt 33315421000001 --hash 5e654b1798cca9b63adcb8091b0962b364581538bc4431449f9e9c674bb0d5f6
