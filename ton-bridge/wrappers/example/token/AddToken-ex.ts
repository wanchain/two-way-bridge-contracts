import {TonClient} from "@ton/ton";
const fs = require("fs");

let jettonTokenInfo = require('../../testData/jettonTokenInfo.json')
const jettonTokenInfoPath = "../../testData/jettonTokenInfo.json";

let tokenInfo = require('../../testData/tokenInfo.json')
const tokenInfoPath = "../../testData/tokenInfo.json";

import {configTestnet, configMainnet, configTestTonApiNoDb} from "../../config/config-ex";

import {Address, toNano, Sender} from '@ton/core';
import {
    getJettonDataContent,
    getJettonData,
    buildWrappedJettonContent,
    parseWrappedJettonContent, getJettonBalance, getJettonAddress
} from "../../wallet/jetton";
import {doCompile} from "../../utils/compileContract";
import {JettonMinter} from "../../JettonMinter";

let args = process.argv.slice(2);
let jettonName = args[0];

const JettonCofig = jettonTokenInfo[jettonName]

import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
import {conf as JettonMinterCompilerConfig} from "../../testData/JettonMinter.compile.func"
import {conf as JettonWalletCompilerConfig} from "../../testData/JettonWallet.compile.func"

const prvList = require('../../testData/prvlist.json')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let nonDeployer = null;
let client = null;
let via;

async function writeJettonTokenInfo(path:string,jettonTokenInfo:any){
    fs.writeFileSync(path,jettonTokenInfo);
}

async function writeTokenInfo(path:string,jettonTokenInfo:any,jettonName:string){
    console.log("tokenInfo=>",tokenInfo);
    tokenInfo[jettonName].dstTokenAcc = jettonTokenInfo[jettonName].tokenAddress;
    tokenInfo[jettonName].walletCodeBase64 = jettonTokenInfo[jettonName].walletCodeBase64;
    fs.writeFileSync(path,JSON.stringify(tokenInfo,null,2));
}

async function init(){
    //await wanTonSdkInit(configMainnet);
    //await wanTonSdkInit(configTestnet);
    await wanTonSdkInit(configTestTonApiNoDb);
    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    nonDeployer = await getWalletByPrvKey(Buffer.from(prvList[1],'hex'));
    via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;

}

import {isAddrDepolyed} from "../../wallet/walletContract";
import {sleep} from "../../utils/utils";
import {TON_FEE} from "../../fee/fee";
import {WanTonClient} from "../../client/client-interface";

async function DisplayJettonInfo(client:WanTonClient,addr:Address){
    let ret = await getJettonData(client,addr);
    console.log("getJettonData=>",ret)

    let retJettonContent = await getJettonDataContent(client,addr);
    console.log("getJettonDataContent=>",await parseWrappedJettonContent(retJettonContent));
}

const fwdAmount = TON_FEE.FWD_FEE_MINT_JETTON;
const totalAmount = TON_FEE.TOTAL_FEE_MINT_JETTON;

async function Mint(client:WanTonClient,via:Sender,jettonMasterAddr:Address,addr:Address, amount:bigint){
    let jettMasterSc = await JettonMinter.createFromAddress(jettonMasterAddr);
    let jettMasterScOpened = await client.open(jettMasterSc)
    let ret = await jettMasterScOpened.sendMint(via,addr,amount,fwdAmount,totalAmount);
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
    jettonTokenInfo[jettonName].tokenAddress =jettonMinterOpened.address.toString();
    jettonTokenInfo[jettonName].walletCodeBase64 = retWallet.codeCell.toBoc().toString('base64');
    await writeJettonTokenInfo(jettonTokenInfoPath,JSON.stringify(jettonTokenInfo,null,2));
    await writeTokenInfo(tokenInfoPath,jettonTokenInfo,jettonName);

    if(await isAddrDepolyed(client,jettonMinterOpened.address.toString())){
        console.log("jettonMinter address :",jettonMinterOpened.address.toString(),"has already deployed");
        return;
    }else{
        let retDeploy = await jettonMinterOpened.sendDeploy(via, TON_FEE.TRANS_FEE_NORMAL)
        console.log("jettonMinter address :",jettonMinterOpened.address.toString());
        console.log(retDeploy);
    }

    /*
    let jwAddrDeployer = await getJettonAddress(client,jettonMinterOpened.address,deployer.address);
    console.log("deployer.jettonAddress=>",jwAddrDeployer.toString());
    let b = await getJettonBalance(client,jettonMinterOpened.address,deployer.address);
    console.log("Before mint balance = %s",b.toString(10));
    console.log("Begin Mint.....");
    await Mint(client,via,jettonMinterOpened.address,deployer.address,toNano('2'))
    console.log("End Mint.....");

    await sleep(5000)
    await DisplayJettonInfo(client,jettonMinterOpened.address);

    b = await getJettonBalance(client,jettonMinterOpened.address,deployer.address);
    console.log("After mint balance = %s",b.toString(10));



    let jwAddrNonDeployer = await getJettonAddress(client,jettonMinterOpened.address,nonDeployer.address);
    console.log("nonDeployer.address=>",nonDeployer.address.toString());
    console.log("nonDeployer.jettonAddress=>",jwAddrNonDeployer.toString());
    b = await getJettonBalance(client,jettonMinterOpened.address,nonDeployer.address);
    console.log("nonDeployer Before mint balance = %s",b.toString(10));
    console.log("Begin Mint to nonDeployer.....");
    await Mint(client,via,jettonMinterOpened.address,nonDeployer.address,toNano('3'))
    console.log("End Mint to nonDeployer.....");

    await sleep(5000)

     */
    await DisplayJettonInfo(client,jettonMinterOpened.address);
    /*
    b = await getJettonBalance(client,jettonMinterOpened.address,nonDeployer.address);
    console.log("nonDeployer After mint balance = %s",b.toString(10));
     */
    // await DisplayJettonInfo(client, Address.parse('EQCsALeDy_a3dzj21ZGMz-tuG9KIZVLmNUapfNtqGia8oqLk'));
}

main();
// ts-node AddToken-ex.ts usdt
// ts-node AddToken-ex.ts wan