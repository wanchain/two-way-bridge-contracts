
import {Bridge} from "../wrappers/Bridge"; // this is the interface class from step 7
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient,  WalletContractV4, Address } from "@ton/ton";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function run() {

    // open wallet v4 (notice the correct wallet version here)
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""

    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint });
    // open wallet and read the current seqno of the wallet
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);
    const seqno = await walletContract.getSeqno();

    const SC = await Bridge.createForDeploy({
        owner: wallet.address,
        halt:0,
        init:0,
        smgFeeProxy:wallet.address,
        oracleAdmin:wallet.address,
        operator: wallet.address,
    });

    // send the deploy transaction
    const bridge = client.open(SC);

    await bridge.sendDeploy(walletSender);

    // wait until confirmed
    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
        await sleep(1000)
        console.log("waiting for deploy transaction to confirm...");
        currentSeqno = await walletContract.getSeqno();
    }
    console.log("deploy transaction confirmed:", bridge.address);
    console.log("contract address:", bridge.address.toString());
}

