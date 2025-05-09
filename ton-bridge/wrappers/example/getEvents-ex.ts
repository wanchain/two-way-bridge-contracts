import {sleep} from "../utils/utils";

import {configTestnet, configMainnet, configTestTonApi} from "../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

async function init(){
    //await wanTonSdkInit(configMainnet);
    //await wanTonSdkInit(configTestnet);
    await wanTonSdkInit(configTestTonApi)
}

const scAddress = require('../testData/contractAddress.json');
const LIMIT=20;
let  MAX_TRY_TIMES = 5;
async function main(){

    await init();
    let client = await getClient();
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

    // while(MAX_TRY_TIMES--){
    //     try{
    //         console.log("===========================Events only AddTokenPair===========================");
    //         let  events = await getEvents(client,scBridgeAddr,LIMIT,undefined,undefined,"AddTokenPair");
    //         for(let event of events){
    //             console.log(event);
    //             logger.info(event);
    //         }
    //         break;
    //     }catch(e){
    //         logger.error(e.message.code);
    //         await sleep(5000)
    //     }
    // }

    client = null;
}

main();
