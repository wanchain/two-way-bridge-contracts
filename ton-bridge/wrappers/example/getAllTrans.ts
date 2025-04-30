import {sleep} from "../utils/utils";

import {configTestnet,configMainnet} from "../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {getAllTransactions, getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const scAddress = require('../testData/contractAddress.json');
const LIMIT=10;
let  MAX_TRY_TIMES = 5;
async function main(){
    await wanTonSdkInit(configMainnet);
    let client = null;
    client = await getClient();
    let scBridgeAddr = scAddress.bridgeAddress;
    while(true){
        //client = await getClient();
        try {
            await getAllTransactions(client, scBridgeAddr, LIMIT, MAX_TRY_TIMES);
            break;
        }catch(e){
            console.log(e);
            await sleep(5000);
        }
    }

    client = null;
}

main();
// ts-node getAllTrans.ts
