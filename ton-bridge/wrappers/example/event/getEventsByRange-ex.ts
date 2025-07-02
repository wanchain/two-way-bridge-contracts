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
    .describe('lt', 'logical time')
    .describe('to_lt', 'to logical time')
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

async function getEventByRange() {
    let scBridgeAddr = argv['contractAddr'];
    let lt = BigInt(argv['lt']);
    let to_lt = BigInt(argv['to_lt']);
    let dbAcces = await DBAccess.getDBAccess();
    if (!dbAcces) {
        console.error("not using db cache");
        return;
    }

    console.log("scBridgeAddr", scBridgeAddr);
    console.log("scBridgeAddr final address", Address.parse(scBridgeAddr).toString());


    let client = await getClient();

    setInterval(async () => {

        console.log("\n\n\n===================================getEventsByRange===================================\n");
        console.log("\n===================================getEventsByRange===================================\n\n\n");

        let tonTrans = [];
        if (!dbAcces?.has(scBridgeAddr)) {
            await dbAcces.addDbByName(scBridgeAddr);
            await sleep(2000);
        }
        try {
            tonTrans = await dbAcces.getAllTransNotHandledByRange(scBridgeAddr, lt, to_lt);
            console.log("getAllTransNotHandledByRange tonTrans.length", tonTrans.length);
        } catch (err) {
            console.error(err.code, err.response?.data?.error)
        }

        for (let tonTran of tonTrans) {
            try {
                console.log("scBridgeAddr", scBridgeAddr, "lt", tonTran.lt.toString(10), "tranHash", tonTran.hash().toString('hex'));
                let ret = await getEventByTranHash(client, scBridgeAddr, tonTran.lt.toString(10), tonTran.hash().toString('hex'));
                console.log("JacobEvent ret = ", ret);
                let tranTonTemp = convertTranToTonTrans([tonTran]);
                await dbAcces.setTranHandleFlag(scBridgeAddr, tranTonTemp[0], true);
            } catch (err) {
                console.error(err.code, err.response?.data?.error)
            }
            await sleep(1000);
        }

    }, 100000)
}

async function main() {
    await init();
    await getEventByRange();
}

main();

// ts-node getAllEvents-ex.ts --network testnet --contractAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr --lt 35100832000001 --to_lt 33781871000003
