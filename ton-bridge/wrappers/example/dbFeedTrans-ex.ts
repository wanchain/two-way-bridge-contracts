import {getClient} from "../client/client";

const DBAccess = require("../db/DbAccess").DBAccess;
const scAddress = require('../testData/contractAddress.json');
let scBridgeAddr = scAddress.bridgeAddress;

async function main(){
    console.log("Entering main function");
    let dbAccess = await DBAccess.getDBAccess();
    if(!dbAccess){
        console.error("not using db cache.")
        return;
    }
    await dbAccess.addDbByName(scBridgeAddr);
    await dbAccess.addDbByName("EQCABVjsQnmRELMK6vjwGbYNRzHXoTd2hvSX6v_VmVrrJNjW");
};

main();

// ts-node dbFeedTrans-ex.ts
