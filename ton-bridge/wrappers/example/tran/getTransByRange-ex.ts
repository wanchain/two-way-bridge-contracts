import {formatError} from "../../utils/utils";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getClient, wanTonSdkInit} from "../../client/client";
import {Address} from "@ton/core";
import {MAX_LIMIT} from "../../const/const-value";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAdd', 'contract address')
    .describe('lt', 'logic time')
    .describe('to_lt', 'to logic time')
    .describe('limit', 'limit number')
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
        let to_lt: string = argv['to_lt'];
        let hash: string = '';
        let limit = parseInt(argv['limit']) > MAX_LIMIT ? MAX_LIMIT : parseInt(argv['limit'])

        let opts = {
            limit: limit, lt, to_lt, hash, archival: true
        }
        console.log("client.getTransactions begin", "addr", scBridgeAddr, "opts", opts);
        let trans = await client.getTransactions(Address.parse(scBridgeAddr), opts)
        console.log("client.getTransactions end", "addr", scBridgeAddr, "opts", opts);

        for (let tran of trans) {
            console.log("txHash", tran.hash().toString('hex'), "lt", tran.lt.toString(10));
        }

        client = null;
    } catch (err) {
        console.error(formatError(err))
    }

}

main();
// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr <lt> <to_lt>
// ts-node getTransByRange-ex.ts --network testnet --contractAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr --lt 36358196000003 --to_lt 33315399000001 --limit 10