import {configMainnetNoDb, configTestnetNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {doCompile} from "../../utils/compileContract";
import {CompilerConfig} from "@ton-community/func-js";
import {beginCell, BitString, contractAddress, Dictionary, SendMode} from "@ton/core";
import {TON_FEE} from "../../fee/fee";


let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null, via = null, foundation = null;

const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('compileConf', 'compile configuration full file path')
    .describe('contractName', 'contract name (bridge|groupApprove)')
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
        //await wanTonSdkInit(configTestTonApiNoDb);
        await wanTonSdkInit(configTestnetNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    foundation = deployer;
}


async function buildCodeCell(conf: CompilerConfig) {
    console.log("conf", conf);
    let ret = await doCompile(conf);
    return ret.codeCell;
}

async function buildBigDataCell_org() {

    //const MAX_NUMBER_DIC = 1_000_000;
    //const MAX_NUMBER_DIC = 100_000;
    const MAX_NUMBER_DIC = 1_000;
    //const MAX_NUMBER_DIC = 10_000;
    const keyLen = 256;
    const valueLen = 256;
    const keys = Dictionary.Keys.BitString(keyLen);
    const values = Dictionary.Values.BitString(valueLen);


    let testDict = Dictionary.empty(keys, values);

    for (let i = 0; i < MAX_NUMBER_DIC; i++) {
        console.log(i);
        let testKey = new BitString(Buffer.from("Test" + i.toString(10)), 0, keyLen);
        let testVal = new BitString(Buffer.from("BitString" + i.toString(10)), 0, valueLen);
        testDict.set(testKey, testVal);
    }
    return beginCell().storeDict(testDict).endCell();
}

async function buildBigDataCell() {

    const keyLen = 256;
    const valueLen = 256;
    const keys = Dictionary.Keys.Uint(keyLen);
    const values = Dictionary.Values.Uint(valueLen);

    let testDict = Dictionary.empty(keys, values);
    return beginCell().storeDict(testDict).endCell();

}

async function deploy() {
    let module = await import(`${argv['compileConf']}`);
    let code = await buildCodeCell(module.conf);

    console.log("Begin buildBigDataCell");
    let data = await buildBigDataCell();
    console.log("End buildBigDataCell");

    const init = {code, data};
    let scAddr = contractAddress(0, init);
    let provider = await client.provider(scAddr, init);
    let ret = await provider.internal(via, {
        value: TON_FEE.TRANS_FEE_DEPLOY,
        //value: toNano('10'),
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell().endCell(),
        bounce: false,
    });
    console.log("contract address", scAddr.toString())
    console.log("ret", ret)
}

async function main() {
    console.log("Entering main function");
    await init();
    await deploy();
}

main();

// ts-node deploy-bigData-ex.ts --network testnet --compileConf /home/jacob/wanchain/two-way-bridge-contracts-opBnb/ton-bridge/wrappers/compile-info/input/bigData.compile.func.ts
