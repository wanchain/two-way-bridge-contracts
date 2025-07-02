import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";
import {getWalletByPrvKey} from "../../wallet/walletContract";
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


async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnet);
    }
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient();
    //console.log("client=>", typeof(client));
}


async function getTokenPair() {
    const tpId = argv["tpId"];
    console.log("tpId = ", tpId);
    let scAddresses = require(config.contractOutput);
    console.log("scAddresses=>", scAddresses);

    // read contract
    let ba = BridgeAccess.create(client, scAddresses.bridgeAddress);
    console.log("bridgeAddess =>", scAddresses.bridgeAddress);
    let ret = await ba.readContract('getTokenPair', [tpId])
    console.log("getTokenPair=>", ret);
}

async function main() {
    console.log("Entering main function");
    await init();
    await getTokenPair();
}

main();
// ts-node getTokenPair-ex --network testnet --tpId 1030

