import {TON_FEE} from "../../fee/fee";

import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey, isAddrDepolyed} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {doCompile} from "../../utils/compileContract";
import {CompilerConfig} from "@ton-community/func-js";
import {BIP44_CHAINID} from "../../const/const-value";
import fs from 'fs';
import {Address} from "@ton/core";


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
        await wanTonSdkInit(configTestTonApiNoDb);
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
    let ret = await doCompile(conf);
    return ret.codeCell;
}

async function deploy() {

    const module = await import(`${argv['compileConf']}`);
    console.log("compile config module", module);
    let code = await buildCodeCell(module.conf);

    let accessPath = null, moduleAccess = null, moudleAccessClassName = null,
        contractAddressName = null, deployConfig = null;
    let scAddresses = require(config.contractOutput)

    if (argv['contractName'].trim().toLowerCase() == 'bridge') {
        accessPath = "../../Bridge";
        moudleAccessClassName = "Bridge";
        contractAddressName = "bridgeAddress";

        deployConfig = {
            owner: deployer.address,
            halt: 0,
            init: 0,
            smgFeeProxy: smgFeeProxy.address,
            oracleAdmin: oracleAdmin.address,
            operator: oracleAdmin.address,
        }
    } else {
        if (argv['contractName'].trim().toLowerCase() == 'groupapprove') {
            accessPath = "../../GroupApprove";
            moudleAccessClassName = "GroupApprove";
            contractAddressName = "groupApproveAddress";

            deployConfig = {
                chainId: BIP44_CHAINID,
                taskId: 0,
                foundation: foundation.address,
                bridge: Address.parse(scAddresses['bridgeAddress'])
            }
        } else {
            throw new Error("contractName error!")
        }
    }

    moduleAccess = await import(`${accessPath}`);
    console.log("moduleAccess", moduleAccess);

    let contract = moduleAccess[`${moudleAccessClassName}`].createFromConfig(deployConfig, code);
    let contractOpened = await client.open(contract);

    if (await isAddrDepolyed(client, scAddresses[`${contractAddressName}`])) {
        console.log("contract has been deployed address :", scAddresses[`${contractAddressName}`], "contractName", argv['contractName']);
        return;
    }

    if (await isAddrDepolyed(client, contractOpened.address.toString())) {
        console.log("contract has been deployed address :", contractOpened.address, "contractName", argv['contractName']);
    } else {
        let ret = await contractOpened.sendDeploy(via, TON_FEE.TRANS_FEE_DEPLOY);
        console.log("contract address :", contractOpened.address, "contractName", argv['contractName']);
        scAddresses[`${contractAddressName}`] = contractOpened.address.toString();
        fs.writeFileSync(config.contractOutput, JSON.stringify(scAddresses, null, 2));
        console.log(ret);
    }
}

async function main() {
    console.log("Entering main function");
    await init();
    await deploy();
}

main();

// ts-node deploy-ex.ts --network testnet --contractName Bridge --compileConf /home/jacob/wanchain/two-way-bridge-contracts-opBnb/ton-bridge/wrappers/compile-info/input/bridge.compile.func.ts
// ts-node deploy-ex.ts --network testnet --contractName GroupApprove --compileConf /home/jacob/wanchain/two-way-bridge-contracts-opBnb/ton-bridge/wrappers/compile-info/input/groupApprove.compile.func.ts