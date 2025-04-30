import {sleep} from "../utils/utils";

import {configTestnet,configMainnet} from "../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../client/client";
import {getEventByTranHash, getEvents, getTransaction} from "../event/getEvents";
import { logger } from "../utils/logger";
import {isTranSuccess} from "../transResult/transResult";

const args = process.argv.slice(2);

async function main(){
    try{
        await wanTonSdkInit(configMainnet);
        await wanTonSdkInit(configTestnet);
        let client = await getClient();
        let scBridgeAddr = args[0];
        let lt = args[1];
        let tranHash = Buffer.from(args[2],'hex').toString('base64');

        console.log("scBridgeAddr",scBridgeAddr,"lt",lt,"tranHash",tranHash);
        let tran = await getTransaction(client,scBridgeAddr,lt,tranHash);
        let ret = await isTranSuccess(tran);
        console.log("ret = ",ret);
        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// ts-node isTranSuccess-ex.ts EQCABVjsQnmRELMK6vjwGbYNRzHXoTd2hvSX6v_VmVrrJNjW 33028013000001 f0f311fecb1775047c741a25b6b714026cd4336d987a956fa7363ad7bec7cab4