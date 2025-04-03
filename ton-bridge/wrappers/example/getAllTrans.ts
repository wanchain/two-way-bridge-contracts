import {sleep} from "../utils/utils";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {getClient, TonClientConfig} from "../client/client";
import {getAllTransactions, getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const scAddress = require('../testData/contractAddress.json');
const LIMIT=10;
let  MAX_TRY_TIMES = 5;
async function main(){
    let client = null;
    let scBridgeAddr = scAddress.bridgeAddress;
    while(true){
        client = await getClient(config);
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
