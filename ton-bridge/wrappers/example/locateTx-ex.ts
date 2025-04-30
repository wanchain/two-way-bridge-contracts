import {sleep} from "../utils/utils";

import {configTestnet,configMainnet} from "../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {getEventByTranHash, getEvents, getTransaction} from "../event/getEvents";
import { logger } from "../utils/logger";
import {Address} from "@ton/core";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";

const args = process.argv.slice(2);

async function main(){
    try{
        await wanTonSdkInit(configMainnet);
        let client = await getClient();
        let scBridgeAddr = args[0];
        let lt = args[1];
        let tranHash = Buffer.from(args[2],'hex').toString('base64');

        console.log("scBridgeAddr",scBridgeAddr,"lt",lt,"tranHash",tranHash);
        let tran = await getTransaction(client,scBridgeAddr,lt,tranHash);
        console.log("tran=>",tran);

        for(let key of tran.outMessages.keys()){
            let outMsg = tran.outMessages[key];
            let resultTx = await client.tryLocateResultTx(outMsg.info.src,outMsg.info.dest,outMsg.info.createdLt.toString(10));
            console.log("=======resultTx",resultTx);
        }

        let inMsg = tran.inMessage;
        let srcTx = await client.tryLocateSourceTx(inMsg.info.src as unknown as Address,inMsg.info.dest as unknown as Address,(inMsg.info as unknown as CommonMessageInfoInternal).createdLt.toString(10))
        console.log("=======source tx",srcTx);

        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// ts-node locateTx-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315399000001 dd22c46a31a348d5ff0b77bb0191b915549af7c450ab905390b3e7d8e6981c32