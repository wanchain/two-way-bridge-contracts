import {bigIntReplacer, sleep} from "../../utils/utils";

import {configTestnet, configMainnet, configTestTonApi, configTestTonApiNoDb} from "../../config/config-ex";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
import {getEventByTranHash, getEvents} from "../../event/getEvents";
import {logger} from "../../utils/logger";
import {DBAccess} from "../../db/DbAccess";
import {Address} from "@ton/core";

const args = process.argv.slice(2);

async function main() {
    //await wanTonSdkInit(configMainnet);
    //await wanTonSdkInit(configTestnet);
    await wanTonSdkInit(configTestTonApi);
    //await wanTonSdkInit(configTestTonApiNoDb);

    let scBridgeAddr = args[0];
    let dbAcces = await DBAccess.getDBAccess();
    if (!dbAcces) {
        console.error("not using db cache");
        return;
    }

    console.log("scBridgeAddr", scBridgeAddr);
    console.log("scBridgeAddr final address", Address.parse(scBridgeAddr).toString());


    let client = await getClient();

    setInterval(async () => {
        let tonTrans = [];
        if (!dbAcces?.has(scBridgeAddr)) {
            await dbAcces.addDbByName(scBridgeAddr);
            await sleep(2000);
        }
        try {
            tonTrans = await dbAcces.getAllTransNotHandled(args[0])
            console.log("getAllTransNotHandled tonTrans.length", tonTrans.length);
        } catch (err) {
            console.error(err.code, err.response?.data?.error)
        }

        for (let tonTran of tonTrans) {
            try {
                console.log("scBridgeAddr", scBridgeAddr, "lt", tonTran.lt.toString(10), "tranHash", tonTran.hash().toString('hex'));
                let ret = await getEventByTranHash(client, scBridgeAddr, tonTran.lt.toString(10), tonTran.hash().toString('hex'));
                console.log("JacobEvent ret = ", ret);

            } catch (err) {
                console.error(err.code, err.response?.data?.error)
            }
            await sleep(1000);
        }

    }, 100000)

}

main();

// ts-node getAllEvents-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr
