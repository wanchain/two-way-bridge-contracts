import {conf } from "../testData/bridge.compile.func"
let filePath = "../testData/bridge.compiled.json";
import {doCompile} from "../utils/compileContract";
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig} from "../client/client";
import {getQueryID} from "../utils/utils";
import {BridgeAccess} from "../contractAccess/bridgeAccess";
import {toNano} from "@ton/core";
import {TON_COIN_ACCOUNT_STR} from "../const/const-value";

const prvList = require('../testData/prvlist')

let client = null;
let queryID;
let deployer;
const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

const scAddresses = require('../testData/contractAddress.json');
(async function main() {
    await init();
    let ret = await doCompile(conf,filePath);
    if(ret){
        console.log(ret);
    }

    let newCode = ret.codeCell;
    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    // write contract
    let via = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
    let opt = {
        sender:via,
        value: toNano('0.05'),
        queryID,
        code:newCode,
    }
    console.log("opt=>",opt);
    ret = await ba.writeContract('sendUpgradeSC',via,opt);
    console.log("sendUpgradeSC",ret);

})()

async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    queryID = await getQueryID();
    client = await getClient(config);
}