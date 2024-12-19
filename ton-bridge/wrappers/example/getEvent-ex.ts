global.TON_NETORK = "testnet";
import {getClient} from "../client/client";
import {getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const scAddress = require('../testData/contractAddress.json');
const LIMIT=100;
async function main(){
    let client = await getClient();
    let scBridgeAddr = scAddress.bridgeAddress;
    try{
        let  events = await getEvents(client,scBridgeAddr,LIMIT);

        for(let event of events){
            console.log(event);
            logger.info(event);
        }
    }catch(e){
            logger.error(e.message);
    }
    client = null;
}

main();
