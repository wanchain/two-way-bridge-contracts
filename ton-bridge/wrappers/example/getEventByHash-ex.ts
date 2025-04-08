import {sleep} from "../utils/utils";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {getClient, TonClientConfig} from "../client/client";
import {getEventByTranHash, getEvents} from "../event/getEvents";
import { logger } from "../utils/logger";

const args = process.argv.slice(2);

async function main(){
    try{
        let client = await getClient(config);
        let scBridgeAddr = args[0];
        let lt = args[1];
        let tranHash = Buffer.from(args[2],'hex').toString('base64');

        console.log("scBridgeAddr",scBridgeAddr,"lt",lt,"tranHash",tranHash);
        let ret = await getEventByTranHash(client,scBridgeAddr,lt,tranHash);

        console.log("ret = ",ret);
        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33028010000003 07e8eb174f5298fe02a7c8a68e3bb3197d2232c287fccbc0deebc44b1334a723