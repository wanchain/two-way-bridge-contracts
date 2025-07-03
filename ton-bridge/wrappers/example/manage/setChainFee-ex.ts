import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID} from "../../utils/utils";
import {TON_FEE} from "../../fee/fee";

let deployer, via;
const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('srcChainId', 'srcChainId')
    .describe('dstChainId', 'dstChainId')
    .describe('contractFee', 'contractFee')
    .describe('agentFee', 'agentFee')
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
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
}


async function setFee() {
    let contractFee = BigInt(argv['contractFee']);
    let agentFee = BigInt(argv['agentFee']);
    let scAddresses = require(config.contractOutput)
    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    let srcChainId = argv['srcChainId']
    let dstChainId = argv['dstChainId']

    // set chain fee
    let ret = await ba.writeContract('sendSetChainFee', via, {
        srcChainId,
        dstChainId,
        contractFee: Number(contractFee),
        agentFee: Number(agentFee),
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID: await getQueryID(),
    })

    let chainFee = await ba.readContract('getChainFee', [srcChainId, dstChainId])
    console.log("chainFee", "srcChainId", srcChainId, "desChainId", dstChainId, chainFee);

}

async function main() {
    console.log("Entering main function");
    await init();
    await setFee();
}

main();

// ts-node setChainFee-ex.ts --network testnet --srcChainId  2153201998 --dstChainId 2147484255 --contractFee 10000 --agentFee 100
