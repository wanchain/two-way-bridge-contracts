import {TON_FEE} from "../../fee/fee";
import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";

const prvList = require('../../testData/prvlist.json')
let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null;
let client = null;

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tpId', 'tokenPairId')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

let queryID;

async function init() {

    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnet);
    }
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    client = await getClient();


}

async function removeTokenPair() {
    const tpId = argv["tpId"];
    console.log("tpId = ", tpId);
    let scAddresses = require(config.contractOutput);
    console.log("scAddresses=>", scAddresses);
    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    // write contract
    let opt = {
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID,
        tokenPairId: tpId,
    }
    console.log("opt=>", opt);
    let via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    let ret3 = await ba.writeContract('sendRemoveTokenPair', via, opt);
    console.log("sendRemoveTokenPair", ret3);
}

async function main() {
    console.log("Entering main function");
    await init();
    await removeTokenPair();
}

main();

// ts-node delTokenPair-ex.ts --network testnet --tpId 1030