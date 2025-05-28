import {sleep} from "../../utils/utils";

import {configTestnet, configMainnet, configTestTonApi} from "../../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
import {getEventByTranHash, getEvents} from "../../event/getEvents";
import { logger } from "../../utils/logger";
import {IsWanTonClient} from "../../client/client-interface";

const args = process.argv.slice(2);

async function main(){
    //await wanTonSdkInit(configMainnet);
    //await wanTonSdkInit(configTestnet);
    await wanTonSdkInit(configTestTonApi)
    try{
        let client = await getClient();
        let scBridgeAddr = args[0];
        let lt = args[1];
        let tranHash = Buffer.from(args[2],'hex').toString('base64');

        console.log("scBridgeAddr",scBridgeAddr,"lt",lt,"tranHash",tranHash);
        console.log("before getEventByTranHash","client is WanTonClient",IsWanTonClient(client));
        let ret = await getEventByTranHash(client,scBridgeAddr,lt,tranHash);

        console.log("ret = ",ret);
        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();
// userLock
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33313072000003 5c6cbcef28ef2514ea0b7594a0dda35e4ce08416312d3c5629388ae21ad54e83
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33313091000003 095015c23c8323af4b7c20b9bd35b2864aa2a4fbaa85335828fa63bccbfdaeff
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33313098000001 391972a7343d4b644e279575ae1e7b4c92fcf4deda69f3fbe5cb5b7b9ea67f2a

// smgRelease
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315421000001 5e654b1798cca9b63adcb8091b0962b364581538bc4431449f9e9c674bb0d5f6
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315410000001 dd22c46a31a348d5ff0b77bb0191b915549af7c450ab905390b3e7d8e6981c32
// ts-node getEventByHash-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315399000001 458f7592928e02d22584a71b290abbf82def08c618ee26acbf2da3ea2eccb7a2