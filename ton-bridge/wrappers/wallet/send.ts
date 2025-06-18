import {Blockchain} from "@ton/sandbox";
import {Address, Cell, Sender, SenderArguments} from "@ton/core";
import {getJettonAddress, getJettonBalance} from "./jetton";
import {JettonWallet} from "../JettonWallet";
import {IsWanTonClient, WanTonClient} from "../client/client-interface";
import {CoinBalance, TokenBalance} from "./balance";
import {TON_FEE} from "../fee/fee";


export async function sendToken(client: WanTonClient | Blockchain, via: Sender,
                                tokenAccount: Address,
                                jetton_amount: bigint,
                                to: Address) {
    if (IsWanTonClient(client)) {
        let srcAddr = via.address;
        let jwSrc = await getJettonAddress(client, tokenAccount, srcAddr);
        let c = JettonWallet.createFromAddress(jwSrc)
        let cOpened = client.open(c);
        await cOpened.sendTransfer(via, TON_FEE.TRANS_FEE_NORMAL, jetton_amount, to, to, Cell.EMPTY, TON_FEE.FWD_TON_AMOUNT_TRANSFER_JETTON, Cell.EMPTY);
        return (await TokenBalance(client, tokenAccount, to))
    } else {
        throw "Not support"
    }
}

export async function sendCoin(client: WanTonClient | Blockchain, via: Sender, dest: Address,value: bigint) {
    if (IsWanTonClient(client)) {
        let senderArg: SenderArguments = {
            value, to: dest
        }
        await via.send(senderArg);
        return (await CoinBalance(client, dest))
    } else {
        throw "Not support"
    }
}