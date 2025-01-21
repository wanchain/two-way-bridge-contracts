import {TonClient} from "@ton/ton";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {
    getJettonDataContent,
    getJettonData,
    buildWrappedJettonContent,
    parseWrappedJettonContent
} from "../wallet/jetton";
import {compileContract,writeCR,doCompile} from "../utils/compileContract";
import {JettonMinter} from "../JettonMinter";
import {JettonWallet} from "../JettonWallet";

const JettonCofig = {
    name:'WAN@wanchain',   // string
    symbol:'WAN', // string
    decimals:'18',  // string
}

import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig} from "../client/client";
import {conf as JettonMinterCompilerConfig} from "../testData/JettonMinter.compile.func"
import {conf as JettonWalletCompilerConfig} from "../testData/JettonWallet.compile.func"

const prvList = require('../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;
let via;

async function init(){
    client = await getClient(config);
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;

}

import {isAddrDepolyed} from "../wallet/walletContract";

async function DisplayJettonInfo(client:TonClient,addr:Address){
    let ret = await getJettonData(client,addr);
    console.log("getJettonData=>",ret)

    let retJettonContent = await getJettonDataContent(client,addr);
    console.log("getJettonDataContent=>",await parseWrappedJettonContent(retJettonContent));
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
    if(await isAddrDepolyed(client,jettonMinterOpened.address.toString())){
        console.log("jettonMinter address :",jettonMinterOpened.address.toString(),"has already deployed");
    }else{
        let retDeploy = await jettonMinterOpened.sendDeploy(via, toNano('0.005'))
        console.log("jettonMinter address :",jettonMinterOpened.address.toString());
        console.log(retDeploy);
    }

    //await DisplayJettonInfo(client,jettonMinterOpened.address);
}

main();