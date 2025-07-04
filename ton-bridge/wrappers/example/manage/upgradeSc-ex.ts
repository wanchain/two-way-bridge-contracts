import {doCompile} from "../../utils/compileContract";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {getQueryID} from "../../utils/utils";
import {TON_FEE} from "../../fee/fee";
import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import path from "path";

let deployer, via;
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
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
}


const scAddresses = require('../../testData/contractAddress.json');

async function upgrade() {
    const module = await import(`${argv['compileConf']}`);
    console.log("compile config module", module);
    let ret = await doCompile(module.conf);
    if (ret) {
        console.log("compile  result", ret);
    }

    let scAddresses = require(config.contractOutput)
    let accessPath = path.join("../../contractAccess", argv['contractName'].trim().toLowerCase() + "Access");
    let moduleAccess = await import(`${accessPath}`);
    console.log("moduleAccess", moduleAccess);
    let moudleAccessClassName = argv['contractName'].trim().toLowerCase().slice(0, 1).toUpperCase() + argv['contractName'].trim().toLowerCase().slice(1) + "Access";
    let contractAddressName = argv['contractName'].trim().toLowerCase() + "Address";
    let newCode = ret.codeCell;
    let contractAccess = moduleAccess[`${moudleAccessClassName}`].create(client, scAddresses[`${contractAddressName}`]);
    console.log("contractAccess", contractAccess);
    // write contract
    let opt = {
        sender: via,
        value: TON_FEE.TRANS_FEE_NORMAL,
        queryID: await getQueryID(),
        code: newCode,
    }
    console.log("opt=>", opt);
    ret = await contractAccess.writeContract('sendUpgradeSC', via, opt);
    console.log(`sendUpgradeSC ${argv['contractName']}`, ret);
}

(async function main() {
    await init();
    await upgrade();
})()

// ts-node upgradeSc-ex.ts --network testnet --contractName Bridge --compileConf /home/jacob/wanchain/two-way-bridge-contracts-opBnb/ton-bridge/wrappers/compile-info/input/bridge.compile.func.ts