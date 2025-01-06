import {Bridge} from "../wrappers/Bridge";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {GroupApprove} from "../wrappers/GroupApprove";
import fs from "fs"
import {BIP44_CHAINID} from "../wrappers/const/const-value";
import {compile} from "@ton/blueprint";


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function run() {

    // open wallet v4 (notice the correct wallet version here)
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""

    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    // const endpoint = await getHttpEndpoint({ network: "testnet"});
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'
    const client = new TonClient({ endpoint, timeout:60000,
        apiKey: 'b70dc1b6d3c1b95acfe5c04c6f0489a7c4f407fd2218cd4a763df295711f2e2e' });
    // open wallet and read the current seqno of the wallet
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);
    const seqno = await walletContract.getSeqno();

    const BridgeCode = await compile('Bridge');
    const SC = Bridge.createFromConfig({
        owner: wallet.address,
        halt:0,
        init:0,
        smgFeeProxy:wallet.address,
        oracleAdmin:wallet.address,
        operator: wallet.address,
    }, BridgeCode, 0);

    // send the deploy transaction
    const bridge = client.open(SC);

    await bridge.sendDeploy(walletSender, toNano('0.1'));

    // wait until confirmed
    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
        await sleep(1000)
        console.log("waiting for deploy transaction to confirm...");
        currentSeqno = await walletContract.getSeqno();
    }
    console.log("deploy transaction confirmed:", bridge.address);
    console.log("bridge contract address:", bridge.address.toString());

    const GroupApproveCode = await compile('GroupApprove');
    const SCGP = GroupApprove.createFromConfig({
        chainId: BIP44_CHAINID,
        taskId:  0,
        foundation: wallet.address,
        bridge: bridge.address,
    }, GroupApproveCode);

    // send the deploy transaction
    const groupApprove = client.open(SCGP);

    await groupApprove.sendDeploy(walletSender, toNano('0.1'));

    // wait until confirmed
    let seqnoGp = await walletContract.getSeqno();
    let currentSeqnoGP = seqno;
    while (currentSeqnoGP == seqnoGp) {
        await sleep(1000)
        console.log("waiting for deploy transaction to confirm...");
        currentSeqnoGP = await walletContract.getSeqno();
    }
    console.log("deploy transaction confirmed:", groupApprove.address);
    console.log("groupApprove contract address:", groupApprove.address.toString());

    let deployed = {
        bridge: bridge.address.toString(),
        groupApprove: groupApprove.address.toString(),
    }
    fs.writeFileSync("deployed.json", JSON.stringify(deployed, null, 2));
}

