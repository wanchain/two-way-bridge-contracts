import {configTestTonApiNoDb} from "../../config/config-ex";
import {Address} from '@ton/core';
import {getClient, wanTonSdkInit} from "../../client/client";
import {JettonMinter} from "../../JettonMinter";
import {WanTonClient} from "../../client/client-interface";

let client;

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'token address')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

async function init() {
    //await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestTonApiNoDb);
    client = await getClient();
}

async function getAdmin(client: WanTonClient, tokenAddress: Address) {

    let jettonMinter = JettonMinter.createFromAddress(tokenAddress);
    let contractProvider = client.provider(jettonMinter.address);

    let adminAddr = await jettonMinter.getAdminAddress(contractProvider)
    console.log("adminAddr", adminAddr.toString());

}

async function main() {
    console.log("argv", process.argv);
    console.log("Entering main function");
    await init();
    let tokenAddr = Address.parse(argv['tokenAddr']);
    await getAdmin(client, tokenAddr);
}

main();

// ts-node getAdmin-ex.ts --network testnet --tokenAddr kQBtNxLicsStcS6NvaXmugOceVqHC1z2Bdl53hBdtODw4wXv

