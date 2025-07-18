import {Blockchain} from "@ton/sandbox";
import {Address, Cell, Sender, SenderArguments, toNano} from "@ton/core";
import {getJettonAddress} from "./jetton";
import {JettonWallet} from "../JettonWallet";
import {IsWanTonClient, WanTonClient} from "../client/client-interface";
import {TokenBalance} from "./balance";
import {TON_FEE} from "../fee/fee";


export async function sendToken(client: WanTonClient | Blockchain, via: Sender,
                                senderAddr: Address,
                                tokenAccount: Address,
                                to: Address,
                                jetton_amount: bigint) {
    if (IsWanTonClient(client)) {
        let jwSrc = await getJettonAddress(client, tokenAccount, senderAddr);
        console.log("jwSrc==>", jwSrc.toString());
        let c = JettonWallet.createFromAddress(jwSrc)
        let cOpened = client.open(c);
        //await cOpened.sendTransfer(via, TON_FEE.TRANS_FEE_NORMAL, jetton_amount, to, to, Cell.EMPTY, TON_FEE.FWD_TON_AMOUNT_TRANSFER_JETTON, Cell.EMPTY);
        await cOpened.sendTransfer(via, toNano('0.039'), jetton_amount, to, to, Cell.EMPTY, TON_FEE.FWD_TON_AMOUNT_TRANSFER_JETTON, Cell.EMPTY);
        return (await TokenBalance(client, tokenAccount, to))
    } else {
        throw "Not support"
    }
}

export async function sendCoin(client: WanTonClient | Blockchain, via: Sender, dest: Address, value: bigint, bounce?: boolean) {

    if (IsWanTonClient(client)) {
        let senderArg: SenderArguments = {
            //value, to: dest, bounce: (bounce == undefined) ? true : bounce, body: beginCell().storeUint(0, 1).endCell(),
            value, to: dest, bounce: (bounce == undefined) ? true : bounce
            //value, to: dest, bounce: false
        }
        await via.send(senderArg);
    } else {
        throw "Not support"
    }
}