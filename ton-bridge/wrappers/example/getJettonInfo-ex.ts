import {TonClient} from "@ton/ton";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {
    getJettonDataContent,
    getJettonData,
    parseWrappedJettonContent
} from "../wallet/jetton";

let args = process.argv.slice(2)
let jettonTokenAddress = args[0]

import {getClient, TonClientConfig} from "../client/client";

const prvList = require('../testData/prvlist')

let client = null;

async function init(){
    client = await getClient(config);
}
async function DisplayJettonInfo(client:TonClient,addr:Address){
    let ret = await getJettonData(client,addr);
    console.log("getJettonData=>",ret)

    let retJettonContent = await getJettonDataContent(client,addr);
    console.log("getJettonDataContent=>",await parseWrappedJettonContent(retJettonContent));
}

async function main() {
    console.log("Entering main function");
    await init();
    await DisplayJettonInfo(client,Address.parse(jettonTokenAddress));
}

main();

// ts-node getJettonInfo-ex.ts EQC9vzT9V5F6wHXRnpDU2blgMBdeQBMJvLUmw_JISfpYKud7
// ts-node getJettonInfo-ex.ts kQBPs490SptIknaQy18XUJ5zUMrQ4Gl8BgHgfxPf-_59R7Mw
// ts-node getJettonInfo-ex.ts EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c