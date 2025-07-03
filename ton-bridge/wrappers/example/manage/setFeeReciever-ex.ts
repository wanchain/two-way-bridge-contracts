import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";

import {Address} from '@ton/core';

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {TON_FEE} from "../../fee/fee";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";
import {sleep} from "@ton/blueprint";

let deployer, via;
const prvList = require('../../testData/prvlist.json')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('feeRecieverAddr', 'fee Reciever address')
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
    deployer = await getWalletByPrvKey(Buffer.from(prvList[2], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[2], 'hex'));
}

async function setFeeProxy() {
    console.log("config", config);
    let scAddresses = require(config.contractOutput);

    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);

    const queryID = await getQueryID();
    let via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    let ret = await ba.writeContract('sendSetFeeProxy', via, {
        feeProxy: Address.parse(argv['feeRecieverAddr']), // EQAqx2ITzIiFmFdXx4DNsGo5jr0Ju7Q3pL9X_qzK11klOsEx
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID,
    });

    await sleep(3000)
    let configInfo = await ba.readContract('getCrossConfig', []);
    console.log("configInfo", configInfo);

}

async function main() {
    console.log("Entering main function");
    await init();
    await setFeeProxy();
}

main();

// ts-node  setFeeProxy.ts --network testnet --feeRecieverAddr EQAqx2ITzIiFmFdXx4DNsGo5jr0Ju7Q3pL9X_qzK11klOsEx
