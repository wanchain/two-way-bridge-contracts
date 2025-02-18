const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {TON_COIN_ACCOUT, BIP44_CHAINID} from '../const/const-value';

import {getWalletByPrvKey} from "../wallet/walletContract";
import {getClient, TonClientConfig} from "../client/client";

let args = process.argv.slice(2);
let tokenPairId=args[0];
const prvList = require('../testData/prvlist')

let deployer =null,smgFeeProxy=null,oracleAdmin = null,robotAdmin = null;
let client = null;

const scAddresses = require('../testData/contractAddress.json');
import { BridgeAccess } from "../contractAccess/bridgeAccess";

async function init(){
    deployer = await getWalletByPrvKey(Buffer.from(prvList[0],'hex'));
    smgFeeProxy = deployer;
    oracleAdmin = deployer;
    robotAdmin = deployer;
    client = await getClient(config);
    console.log("client=>",client);
}


async function getTokenPair(){
    // read contract
    let ba = BridgeAccess.create(client,scAddresses.bridgeAddress);
    console.log("bridgeAddess =>",scAddresses.bridgeAddress);
    let ret = await ba.readContract('getTokenPair',[tokenPairId])
    console.log("getTokenPair=>", ret);
}

async function main(){
    console.log("Entering main function");
    await init();
    await getTokenPair();
};

main();
// ts-node getTokenPair-ex.ts 941
// ts-node getTokenPair-ex.ts 939
// ts-node getTokenPair-ex.ts 940