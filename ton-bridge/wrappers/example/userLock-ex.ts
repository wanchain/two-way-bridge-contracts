import {TonClient} from "@ton/ton";
import {getClient, TonClientConfig} from "../client/client";
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {buildUserLockMessages} from "../code/userLock";
import {toNano} from "@ton/core";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
const prvList = require('../testData/prvlist')
const scAddresses = require('../testData/contractAddress.json');

const smgCfg = require('../testData/smg.json');

let smgID = smgCfg.smgId
let crossValue = toNano('0.1')
let bridgeScAddr = scAddresses.bridgeAddress
let transValue = toNano('0.05')
let dstUserAccount = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"




async function userLockCoin(){

}

async function userLockWrappedToken(){

}

async function userLockOriginalToken(){

}

async function main() {
    let client = await getClient(config);
    let sender = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    let senderAccount = sender.address.toString();

    let msgs = await buildUserLockMessages({
        value:transValue,
        smgID,
        tokenPairID:940,
        crossValue,
        bridgeScAddr,
        client,
        senderAccount,
        dstUserAccount,
    })
    console.log("msgs=>",msgs);
}
main();