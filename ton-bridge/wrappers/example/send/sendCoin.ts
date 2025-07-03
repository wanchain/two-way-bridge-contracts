import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {WanTonClient} from "../../client/client-interface";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {Address, Sender} from "@ton/core";
import {sendCoin} from "../../wallet/send";
import {CoinBalance} from "../../wallet/balance";
import {sleep, toNumberByDecimal} from "../../utils/utils";

let deployer, via;

const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('toAddr', 'to address')
    .describe('decimal', 'decimal')
    .describe('amount', 'amount (the minest unit)')
    .string('amount')
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
    deployer = await getWalletByPrvKey(Buffer.from(prvList[1], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[1], 'hex'));
}

async function send(client: WanTonClient, via: Sender, amount: bigint, dest: Address) {
    return (await sendCoin(client, via, dest, amount))
}

async function main() {
    console.log("Entering main function");
    console.log(process.argv);
    await init();
    let destAddr = Address.parse(argv['toAddr'])
    let decimal = Number(argv['decimal']);
    let amount = argv['amount'];  // decimal 9
    let finalAmount = toNumberByDecimal(amount, decimal);
    let balance = await CoinBalance(client, destAddr);
    console.log(`before balance of ${argv['toAddr']} is ${balance}`);
    let ret = await send(client, via, finalAmount, destAddr)
    await sleep(5000)
    console.log(`After balance of ${argv['toAddr']} is ${ret}`);
}

main();
// ts-node sendCoin.ts --network testnet --toAddr EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh --decimal 9 --amount 0.01
