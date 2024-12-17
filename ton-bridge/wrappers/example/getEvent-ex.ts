import {getClient} from "../client/client";
import {getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const scAddress = require('../testData/contractAddress.json');
const LIMIT=100;
async function main(){
    let client = await getClient('testnet');
    let scBridgeAddr = scAddress.bridgeAddress;

    let lt_end = BigInt(Math.floor(new Date().getTime()/1000))
    let lt_start = lt_end - BigInt(4*86400)

    try{
        let  events = await getEvents(client,scBridgeAddr,LIMIT,lt_start,lt_end);

        for(let event of events){
            logger.info(event);

        }
    }catch(e){
            logger.error(e.message);
    }
    client = null;
}

main();
