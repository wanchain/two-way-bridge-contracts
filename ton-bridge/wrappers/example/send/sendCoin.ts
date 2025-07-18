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
    .describe('bounce', 'bounce')
    .boolean('bounce')
    .describe('senderPrv', 'sender private key')
    .string('senderPrv')
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

    let sendPrv = argv['senderPrv'];
    if (sendPrv && sendPrv.trim().length) {
        deployer = await getWalletByPrvKey(Buffer.from(sendPrv.trim(), 'hex'));
        via = await getSenderByPrvKey(client, Buffer.from(sendPrv.trim(), 'hex'));
    } else {
        deployer = await getWalletByPrvKey(Buffer.from(prvList[1], 'hex'));
        via = await getSenderByPrvKey(client, Buffer.from(prvList[1], 'hex'));
    }
}

async function send(client: WanTonClient, via: Sender, amount: bigint, dest: Address, bounce: boolean) {
    return (await sendCoin(client, via, dest, amount, bounce))
}

async function main() {
    console.log("Entering main function", "bounce", argv['bounce']);
    console.log(process.argv);
    await init();
    let destAddr = Address.parse(argv['toAddr'])
    let decimal = Number(argv['decimal']);
    let amount = argv['amount'];  // decimal 9
    let finalAmount = toNumberByDecimal(amount, decimal);
    try {
        let balance = await CoinBalance(client, destAddr);
        console.log(`before balance of ${argv['toAddr']} is ${balance}`);
    } catch (err) {
        console.error("CoinBalance", err);
    }
    console.log("sender account", deployer.address.toString());
    let ret = await send(client, via, finalAmount, destAddr, argv['bounce'])
    await sleep(5000)
    console.log(`After balance of ${argv['toAddr']} is ${ret}`);
}

main();
// ts-node sendCoin.ts --network testnet --toAddr EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh --decimal 9 --amount 0.01  --senderPrv 378746ef979d1b738eb329809d83b47f64850e2e560bcfaeb76d1992fc0c9aa15ebbfbdf5bfbe1dd6e067de9423a550527673df153c25bd11915a68bbab17fb4
// ts-node sendCoin.ts --network testnet --toAddr EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh --decimal 9 --amount 0.001  --senderPrv 378746ef979d1b738eb329809d83b47f64850e2e560bcfaeb76d1992fc0c9aa15ebbfbdf5bfbe1dd6e067de9423a550527673df153c25bd11915a68bbab17fb4