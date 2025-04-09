import {TonClient} from "@ton/ton";
import {getClient, TonClientConfig} from "../client/client";
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {buildUserLockMessages} from "../code/userLock";
import {Address, toNano} from "@ton/core";
import {BridgeAccess} from "../contractAccess/bridgeAccess";
import {getQueryID, sleep} from "../utils/utils";
import {common} from "../common";
import {BIP44_CHAINID, TON_COIN_ACCOUNT_STR, TON_COIN_ACCOUT} from "../const/const-value";

import {getJettonAddress } from "../wallet/jetton";

const schnorr = require("../sign/tools-secp256k1.js");
import * as util from "node:util";
import {TON_FEE} from "../fee/fee";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
const prvList = require('../testData/prvlist')
const prvAlice = Buffer.from(prvList[1],'hex');
const prvBob = Buffer.from(prvList[2],'hex');

const scAddresses = require('../testData/contractAddress.json');

const smgCfg = require('../testData/smg.json');
const tokenInfo = require('../testData/tokenInfo.json');
let smgID = smgCfg.smgId
let smgReleaseValue = toNano('0.1')
let bridgeScAddr = scAddresses.bridgeAddress
let transValueSmgRelease = TON_FEE.TRANS_FEE_SMG_RELEASE
let smgAgentFee = BigInt(1000); // should get from contract.
let dstUserAccount = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"
let aliceSender;

let smgConfig = require('../testData/smg.json')


let client = null;
let aliceWallet,aliceAddressStr,aliceAddress;
let bobWallet,bobAddress,bobAddressStr;

async function init() {
    client = await getClient(config);
    aliceWallet = await getWalletByPrvKey(prvAlice);
    bobWallet = await getWalletByPrvKey(prvBob);

    aliceAddressStr = aliceWallet.address.toString();
    aliceAddress = aliceWallet.address;

    bobAddressStr = bobWallet.address.toString();
    bobAddress = bobWallet.address;
    aliceSender = await getSenderByPrvKey(client, prvAlice);
}


async function getAgentFee(tokenPairID:number,srcChainId:number,dstChainId:number){
    let ba = BridgeAccess.create(client,bridgeScAddr);
    let tokenPairFee = await ba.readContract('getTokenPairFee',[tokenPairID]);
    let chainFee = await ba.readContract('getChainFee',[srcChainId,dstChainId]);
    if(chainFee.agentFee){
        return chainFee.agentFee
    }else{
        return tokenPairFee.agentFee
    }
}
const jetton = require('../wallet/jetton');

async function getJettonWalletAddr(client:TonClient,tokenAccountAddr:Address,ownerAddress:Address){
    if(tokenAccountAddr.equals(Address.parse(TON_COIN_ACCOUNT_STR))){
        return Address.parse(TON_COIN_ACCOUNT_STR);
    }else{
        return getJettonAddress(client,tokenAccountAddr,ownerAddress);
    }
}

async function buildSmgReleaseParameters(client:TonClient,input:{
    smgID:string,
    tokenPairID:number,
    releaseValue:bigint,
    value:bigint,
    queryID:bigint,
    uniqueID:bigint,
    tokenCoinAccount:Address,
    destAccount:Address,
    fwTonAmount:bigint,
    totalTonAmount:bigint,
},srcChainId:number,dstChainId:number,bridgeScAddr:Address){
    let bridgeJwAddress = await getJettonWalletAddr(client,input.tokenCoinAccount, bridgeScAddr);
    let agentFee = await getAgentFee(input.tokenPairID,srcChainId,dstChainId);

    let msgHashResult = common.computeHash(BigInt(BIP44_CHAINID),
        BigInt(input.uniqueID),
        BigInt(input.tokenPairID),
        BigInt(input.releaseValue),
        BigInt(agentFee),
        input.tokenCoinAccount,
        input.destAccount);
    console.log("smgConfig.skSmg=>",smgConfig.skSmg);
    let sig = schnorr.getSecSchnorrSByMsgHash(Buffer.from(smgConfig.skSmg,'hex'),msgHashResult.hashBuf);
    console.log("sig=>",sig);
    const e = BigInt(sig.e);

    const p = BigInt(sig.p);
    const s = BigInt(sig.s);

    return {
        value: input.value,
        queryID:input.queryID,
        uniqueID:input.uniqueID,
        smgID:input.smgID,
        tokenPairID:input.tokenPairID,
        releaseValue:input.releaseValue,
        fee:agentFee,
        userAccount: input.destAccount,
        bridgeJettonWalletAddr:bridgeJwAddress,
        e,
        p,
        s,
        fwTonAmount:input.fwTonAmount,
        totalTonAmount:input.totalTonAmount,
    }
}

async function smgRelease(){
    try{
        let transValueSmg : bigint = transValueSmgRelease;
        let ba = BridgeAccess.create(client,bridgeScAddr);
        for(let key of Object.keys(tokenInfo)) {
            console.log("key:",key);
            // if(key.toString().toLowerCase() !== "tokenwrapped"){
            //     continue;
            // }
            // if(key.toString().toLowerCase() !== "coin"){
            //     continue;
            // }
            // if(key.toString().toLowerCase() !== "tokenOrg".toLowerCase()){
            //     continue;
            // }

            if(key.toString().toLowerCase() !== "coin".toLowerCase()){
                transValueSmg = TON_FEE.TRANS_FEE_USER_LOCK_TOKEN;
            }

            let smgReleasePara = await buildSmgReleaseParameters(client,{
                smgID:smgConfig.smgId,
                tokenPairID:tokenInfo[key].tokenPairId,
                releaseValue:smgReleaseValue,
                value:transValueSmg,
                queryID:BigInt(await getQueryID()),
                uniqueID:BigInt(await getQueryID()),  // should be txHas->bigInt, here is the example.
                tokenCoinAccount:Address.parse(tokenInfo[key].dstTokenAcc),
                //tokenCoinAccount:Address.parseFriendly(tokenInfo.tokenOrg.dstTokenAcc).address,
                destAccount:bobAddress,
                fwTonAmount:TON_FEE.FWD_TON_AMOUNT_TRANSFER_JETTON,
                totalTonAmount:TON_FEE.TOTAL_TON_AMOUNT_TRANSFER_JETTON
            },tokenInfo[key].srcChainId,tokenInfo[key].dstChainId,Address.parse(bridgeScAddr))
            let ret = await ba.writeContract('sendSmgRelease', aliceSender, smgReleasePara)
            await sleep(3000);
            console.log("key = %s, ret of smRelease is %s",key,ret);
        }

    }catch(e){
        console.log("err  =%s",e.Error,e);
    }
}
async function main() {

    await init();
    await smgRelease();

}
main();