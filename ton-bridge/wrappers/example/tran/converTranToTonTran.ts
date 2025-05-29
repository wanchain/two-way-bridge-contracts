import {configTestnet,configMainnet} from "../../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
import {getEventByTranHash, getEvents, getTransaction} from "../../event/getEvents";
import {convertTonTransToTrans, convertTranToTonTrans} from "../../db/common";

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
        let ret = await getTransaction(client,scBridgeAddr,lt,tranHash);
        console.log("ret = ",ret);

        let tonTrans = await convertTranToTonTrans([ret]);
        console.log("tonTran",tonTrans);

        let trans = await convertTonTransToTrans(tonTrans);
        console.log("trans",trans);

        client = null;
    }catch(err){
        console.error(err.code,err.response?.data?.error)
    }

}

main();

// ts-node converTranToTonTran.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33028010000001 61ec9d0be00c8f65a8e84b1a13121d8fbd826cf7777f856bc5f72381bf6b2257
// ts-node converTranToTonTran.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33028010000003 07e8eb174f5298fe02a7c8a68e3bb3197d2232c287fccbc0deebc44b1334a723
// ts-node converTranToTonTran.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33313091000003 095015c23c8323af4b7c20b9bd35b2864aa2a4fbaa85335828fa63bccbfdaeff

