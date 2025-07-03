import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";


import {WanTonClient} from "../../client/client-interface";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {Address, Sender} from "@ton/core";
import {sendToken} from "../../wallet/send";
import {TokenBalance} from "../../wallet/balance";
import {sleep, toNumberByDecimal} from "../../utils/utils";

let deployer, via;
const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'token address')
    .describe('toAddr', 'to address')
    .describe('decimal', 'decimal')
    .describe('amount', 'amount (the minest unit)')
    .string('amount')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 5) {
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
    deployer = await getWalletByPrvKey(Buffer.from(prvList[2], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[2], 'hex'));
}

async function send(client: WanTonClient, via: Sender, senderAddr: Address, tokenAccount: Address, dest: Address, amount: bigint) {
    return (await sendToken(client, via, senderAddr, tokenAccount, dest, amount))
}

async function main() {
    await init();
    console.log("via", via);
    console.log("Entering main function", "fromAddress", deployer.address);
    let tokenAccountAddr = Address.parse(argv['tokenAddr'])
    let destAddr = Address.parse(argv['toAddr'])
    let decimal = argv['decimal']
    let amount = argv['amount']
    let finnalAmount = toNumberByDecimal(argv['amount'], decimal)
    let balance = await TokenBalance(client, tokenAccountAddr, destAddr);
    console.log(`before balance of ${argv['toAddr']} is ${balance}`);
    let ret = await send(client, via, deployer.address, tokenAccountAddr, destAddr, finnalAmount)
    await sleep(5000)
    console.log(`After balance of ${argv['toAddr']} is ${ret}`);
}

main();
// ts-node sendToken.ts --network testnet --tokenAddr EQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK_f9 --toAddr 0QALz9kOW8wETujt9zDgLCaEfevg3PU6sljgead4op81Jixq --decimal 6 --amount 1000

