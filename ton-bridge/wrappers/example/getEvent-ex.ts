import {sleep} from "../utils/utils";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {getClient, TonClientConfig} from "../client/client";
import {getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const scAddress = require('../testData/contractAddress.json');
const LIMIT=10;
let  MAX_TRY_TIMES = 5;
async function main(){
    let client = await getClient(config);
    let scBridgeAddr = scAddress.bridgeAddress;
    while(MAX_TRY_TIMES--){
        try{
            console.log("===========================Events no fileter (eventName)===========================");
            let  events = await getEvents(client,scBridgeAddr,LIMIT);

            for(let event of events){
                console.log(event);
                logger.info(event);
            }
            break;
        }catch(e){
            logger.error(e.message.code);
            await sleep(5000)
        }
    }

    while(MAX_TRY_TIMES--){
        try{
            console.log("===========================Events only AddTokenPair===========================");
            let  events = await getEvents(client,scBridgeAddr,LIMIT,undefined,undefined,"AddTokenPair");
            for(let event of events){
                console.log(event);
                logger.info(event);
            }
            break;
        }catch(e){
            logger.error(e.message.code);
            await sleep(5000)
        }
    }

    client = null;
}

main();
