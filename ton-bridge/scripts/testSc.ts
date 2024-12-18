
import {Bridge} from "../wrappers/Bridge"; // this is the interface class from step 7
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import { GroupApprove } from "../wrappers/GroupApprove";


const scAddr = require('../deployed.json')




function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function run() {

    const endpoint = await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint, timeout:60000 });

    const SC = await Bridge.createFromAddress(Address.parseFriendly(scAddr.bridge).address);
    const bridge = client.open(SC);
    console.log("contract address:", bridge.address.toString());
    let CrossConfig = await bridge.getCrossConfig();
    console.log("CrossConfig:",CrossConfig)

    let tokenPair = await bridge.getTokenPair(100)
    console.log("tokenPair 100:", tokenPair)

    const SCGP = await GroupApprove.createFromAddress(Address.parseFriendly(scAddr.groupApprove).address);
    const groupApprove = client.open(SCGP);
    console.log("groupApprove contract address:", groupApprove.address.toString());
    let GpConfig = await groupApprove.getConfig();
    console.log("GpConfig:",GpConfig) 
}


