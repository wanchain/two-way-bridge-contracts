import {bigIntToBytes32, sleep} from "../utils/utils";

import {configTestnet, configMainnet, configTestnetObs} from "../config/config-ex";

import {getClient, TonClientConfig, TonConfig, TonUrlConfig, wanTonSdkInit} from "../client/client";
import {getEventByTranHash, getEvents, getTransaction, getTransactionFromDb} from "../event/getEvents";
import { logger } from "../utils/logger";

const args = process.argv.slice(2);

async function main(){
    try{
        //await wanTonSdkInit(configMainnet);
        //await wanTonSdkInit(configTestnet);
        await wanTonSdkInit(configTestnetObs);

        let client = await getClient();
        let scBridgeAddr = args[0];
        let lt = args[1];
        let tranHash = Buffer.from(args[2],'hex').toString('base64');

        console.log("scBridgeAddr",scBridgeAddr,"lt",lt,"tranHash",tranHash);
        //let ret = await getTransaction(client,scBridgeAddr,lt,tranHash);
        //let ret = await getTransaction(client,scBridgeAddr,lt,args[2]);
        console.log(".......args=",args);

        //let ret = await getTransactionFromDb(client,scBridgeAddr,lt,args[2]);
        let ret = await getTransaction(client,scBridgeAddr,lt,args[2]);
        console.log("ret = ",ret);

        console.log(ret.prevTransactionLt.toString(10),ret.prevTransactionHash.toString(16))

        let base64Str = Buffer.from(ret.prevTransactionHash.toString(16),'hex').toString('base64');
        console.log(base64Str);

        console.log(Buffer.from(base64Str,'base64').toString('hex'));

        console.log(Buffer.from(ret.prevTransactionHash.toString(16),'hex').toString('hex'));

        console.log("hex",bigIntToBytes32(ret.prevTransactionHash).toString('hex'));
        console.log("base64",bigIntToBytes32(ret.prevTransactionHash).toString('base64'));


        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// mainnet
// ts-node getTransaction-ex.ts EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs 56510003000001 fEULm54qtjiWNCWgqPuik7rnVg8TxFjgrEwkaGIeqAw=

// testnet
// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33028010000001 61ec9d0be00c8f65a8e84b1a13121d8fbd826cf7777f856bc5f72381bf6b2257
// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33028010000003 07e8eb174f5298fe02a7c8a68e3bb3197d2232c287fccbc0deebc44b1334a723
// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33313091000003 095015c23c8323af4b7c20b9bd35b2864aa2a4fbaa85335828fa63bccbfdaeff

// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33891688000001 0759391fa78661e683e21db834a71588b9020f0ad04a490c53544e6349ef4d09

// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 34281132000001 9y6BeftoRpFWzPfw14t5TjMfnpmby4BQv//GXuCfJY0=
// ts-node getTransaction-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 34281132000001 f72e8179fb68469156ccf7f0d78b794e331f9e999bcb8050bfffc65ee09f258d