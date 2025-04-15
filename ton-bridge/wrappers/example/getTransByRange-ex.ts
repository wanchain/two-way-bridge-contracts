import {sleep} from "../utils/utils";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {getClient, TonClientConfig} from "../client/client";
import {getEventByTranHash, getEvents, getTransaction} from "../event/getEvents";
import { logger } from "../utils/logger";
import {Address} from "@ton/core";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";

const args = process.argv.slice(2);

async function main(){
    try{
        let client = await getClient(config);
        let scBridgeAddr = args[0];
        let lt = args[1];
        let to_lt:string = args[2];

        let trans = await client.getTransactions(Address.parse(scBridgeAddr),{limit:10,lt,to_lt,archival:true
        })

        for(let tran of trans){
            console.log("txHash",tran.hash().toString('hex'));
        }

        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// (to_lt,lt]
// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315421000001 33315399000001

