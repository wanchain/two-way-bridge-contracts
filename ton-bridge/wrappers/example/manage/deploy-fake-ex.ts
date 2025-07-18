import {configMainnetNoDb, configTestTonApiNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {doCompile} from "../../utils/compileContract";
import {CompilerConfig} from "@ton-community/func-js";
import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from "@ton/core";


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


class Fake implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Fake(address);
    }

    static createFromConfig(data: Cell, code: Cell, workchain = 0) {
        const init = {code, data};
        return new Fake(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
            bounce: false,
        });
    }
}

async function buildCodeCell(conf: CompilerConfig) {
    console.log("conf", conf);
    let ret = await doCompile(conf);
    return ret.codeCell;
}

async function deploy() {
    let module = await import(`${argv['compileConf']}`);
    let code = await buildCodeCell(module.conf);
    let data = Cell.EMPTY;
    //
    let fake = Fake.createFromConfig(data, code);
    let fakeOpened = await client.open(fake);
    let ret = await fakeOpened.sendDeploy(via, toNano('0.01'))

    console.log("contract address", fakeOpened.address.toString())
    console.log("ret", ret)


    // const init = {code, data};
    // let scAddr = contractAddress(0, init);
    // let provider = await client.provider(scAddr, init);
    // let ret = await provider.internal(via, {
    //     value: TON_FEE.TRANS_FEE_DEPLOY,
    //     sendMode: SendMode.PAY_GAS_SEPARATELY,
    //     body: beginCell().endCell(),
    //
    // });
    // console.log("contract address", scAddr.toString())
    // console.log("ret", ret)

}

async function main() {
    console.log("Entering main function");
    await init();
    await deploy();
}

main();

// ts-node deploy-fake-ex.ts --network testnet --compileConf /home/jacob/wanchain/two-way-bridge-contracts-opBnb/ton-bridge/wrappers/compile-info/input/fakeThrow.compile.func.ts
