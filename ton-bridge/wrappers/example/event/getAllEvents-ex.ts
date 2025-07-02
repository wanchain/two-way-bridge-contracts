import {sleep} from "../../utils/utils";

import {configMainnet, configTestTonApi} from "../../config/config-ex";
import {getClient, wanTonSdkInit} from "../../client/client";
import {getEventByTranHash} from "../../event/getEvents";
import {DBAccess} from "../../db/DbAccess";
import {Address} from "@ton/core";
import {convertTranToTonTrans} from "../../db/common";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('contractAddr', 'contractAddr')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

let client = null;

async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApi);
    } else {
        await wanTonSdkInit(configMainnet);
    }

    client = await getClient();
}

async function doingWork() {
    let scBridgeAddr = argv['contractAddr'];
    let dbAcces = await DBAccess.getDBAccess();
    if (!dbAcces) {
        console.error("not using db cache");
        return;
    }

    console.log("scBridgeAddr", scBridgeAddr);
    console.log("scBridgeAddr final address", Address.parse(scBridgeAddr).toString());

    let scanEvent = async () => {
        console.log("\n\n\n===================================getAllEvents===================================\n");
        console.log("\n===================================getAllEvents===================================\n\n\n");

        let tonTrans = [];
        if (!dbAcces?.has(scBridgeAddr)) {
            await dbAcces.addDbByName(scBridgeAddr);
            await sleep(2000);
        }
        try {
            tonTrans = await dbAcces.getAllTransNotHandled(scBridgeAddr);
            console.log("getAllTransNotHandled tonTrans.length", tonTrans.length);
        } catch (err) {
            console.error(err.code, err.response?.data?.error)
        }
        if (!tonTrans) {
            return;
        }
        for (let tonTran of tonTrans) {
            try {
                console.log("begin getEventByTranHash", "scBridgeAddr", scBridgeAddr, "lt", tonTran.lt.toString(10), "tranHash", tonTran.hash().toString('hex'));
                let ret = await getEventByTranHash(client, scBridgeAddr, tonTran.lt.toString(10), tonTran.hash().toString('hex'));
                console.log("end getEventByTranHash JacobEvent ret = ", ret);

                let tranTonTemp = convertTranToTonTrans([tonTran]);

                console.log("begin setTranHandleFlag", "scBridgeAddr", scBridgeAddr, "lt", tonTran.lt.toString(10), "tranHash", tonTran.hash().toString('hex'));
                await dbAcces.setTranHandleFlag(scBridgeAddr, tranTonTemp[0], true);
            } catch (err) {
                console.error(err.code, err.response?.data?.error)
            }
            await sleep(1000);
        }
    }

    let round = 1;
    let busy = false;
    setInterval(async () => {
        if (!busy) {
            busy = true;
            console.log("round = ", round++);
            await scanEvent();
            busy = false;
        }

    }, 10000)
}

async function main() {
    await init();
    await doingWork();
}

main();

// ts-node getAllEvents-ex.ts --network testnet --contractAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr
