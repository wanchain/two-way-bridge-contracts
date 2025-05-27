import {TonClient} from "@ton/ton";

import {configTestnet,configMainnet} from "../config/config-ex";

import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {
    getJettonDataContent,
    getJettonData,
    parseWrappedJettonContent
} from "../wallet/jetton";

let args = process.argv.slice(2)
let jettonTokenAddress = args[0]

import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {WanTonClient} from "../client/client-interface";

const prvList = require('../testData/prvlist')

let client = null;

async function init(){
    //await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestnet);
    client = await getClient();
}
async function DisplayJettonInfo(client:WanTonClient,addr:Address){
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

// ts-node getJettonInfo-ex.ts EQB7MS_HPERUy7btkQlbgn3L4GQN_eqoev_D3jv6DvH9OxqL
// ts-node getJettonInfo-ex.ts EQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v1eF

// ts-node getJettonInfo-ex.ts EQC9vzT9V5F6wHXRnpDU2blgMBdeQBMJvLUmw_JISfpYKud7
// ts-node getJettonInfo-ex.ts kQBPs490SptIknaQy18XUJ5zUMrQ4Gl8BgHgfxPf-_59R7Mw
// ts-node getJettonInfo-ex.ts EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c
