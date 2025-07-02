import {getClient, wanTonSdkInit} from "../../client/client";
import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";
import {getSenderByPrvKey, getWalletByPrvKey, isAddrDepolyed} from "../../wallet/walletContract";
import {WanTonClient} from "../../client/client-interface";
import {Address} from "@ton/core";
import {
    buildWrappedJettonContent,
    getJettonData,
    getJettonDataContent,
    parseWrappedJettonContent
} from "../../wallet/jetton";
import {doCompile} from "../../utils/compileContract";
import {JettonMinter} from "../../JettonMinter";
import {TON_FEE} from "../../fee/fee";
import {conf as JettonMinterCompilerConfig} from "../../testData/JettonMinter.compile.func"
import {conf as JettonWalletCompilerConfig} from "../../testData/JettonWallet.compile.func"
import {sleep} from "../../utils/utils";


const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name')
    .describe('name', 'jetton token name')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

let jettonName = argv['name'];

console.log("config", config);

const fs = require("fs");

let jettonInput = require(config["tokenInput"]);
const JettonCofig = jettonInput[jettonName];

const prvList = require('../../testData/prvlist.json')

let deployer = null, smgFeeProxy = null, oracleAdmin = null, robotAdmin = null;
let nonDeployer = null;
let client = null;
let via;

async function writeJettonTokenInfo(path: string, jettonTokenInfo: any) {
    fs.writeFileSync(path, jettonTokenInfo);
}

async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnet);
    }

    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    nonDeployer = await getWalletByPrvKey(Buffer.from(prvList[1], 'hex'));
    via = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;

}

async function DisplayJettonInfo(client: WanTonClient, addr: Address) {
    let ret = await getJettonData(client, addr);
    console.log("getJettonData=>", ret)

    let retJettonContent = await getJettonDataContent(client, addr);
    console.log("getJettonDataContent=>", await parseWrappedJettonContent(retJettonContent));
}

async function main() {
    console.log("Entering main function");
    await init();
    let jettonContent = await buildWrappedJettonContent(JettonCofig);

    let retMinter = await doCompile(JettonMinterCompilerConfig)
    let retWallet = await doCompile(JettonWalletCompilerConfig)

    let jettonMinterOpened = await client.open(
        JettonMinter.createFromConfig(
            {
                admin: deployer.address,  // set admin  and deploy token in one step.
                content: jettonContent,
                wallet_code: retWallet.codeCell,
            },
            retMinter.codeCell));
    let jettonTokenInfo = Object.assign({}, JettonCofig);
    jettonTokenInfo.tokenAddress = jettonMinterOpened.address.toString();
    jettonTokenInfo.walletCodeBase64 = retWallet.codeCell.toBoc().toString('base64');

    let jettonAll = require(config.tokenOutput);
    console.log("jettonAll", jettonAll);
    jettonAll[jettonName] = jettonTokenInfo;

    if (await isAddrDepolyed(client, jettonMinterOpened.address.toString())) {
        console.log("jettonMinter address :", jettonMinterOpened.address.toString(), "has already deployed");
    } else {
        console.log("begin deploy jettonMinter address :", jettonMinterOpened.address.toString());
        let retDeploy = await jettonMinterOpened.sendDeploy(via, TON_FEE.TRANS_FEE_NORMAL)
        console.log("jettonMinter address :", jettonMinterOpened.address.toString());
        console.log(retDeploy);
        await writeJettonTokenInfo(config.tokenOutput, JSON.stringify(jettonAll, null, 2));
        await sleep(5000);
    }
    await DisplayJettonInfo(client, jettonMinterOpened.address);
}

main();
// ts-node addToken-ex.ts --network testnet --name usdt
// ts-node addToken-ex.ts --network testnet --name wan

