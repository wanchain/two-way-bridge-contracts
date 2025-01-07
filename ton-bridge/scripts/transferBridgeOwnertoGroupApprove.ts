
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
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    // const endpoint = await getHttpEndpoint({ network: "testnet"});
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'
    const client = new TonClient({ endpoint, timeout:60000,
        apiKey: 'b70dc1b6d3c1b95acfe5c04c6f0489a7c4f407fd2218cd4a763df295711f2e2e' });
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);

    const SC = await Bridge.createFromAddress(Address.parseFriendly(scAddr.bridge).address);
    const bridge = client.open(SC);

    let ret
    ret = await bridge.sendTransferCrossOwner(walletSender,{
        owner: Address.parseFriendly(scAddr.groupApprove).address,
        value: toNano('0.051'),
        queryID: 1,
    });
    console.log("ret:", ret)
}


