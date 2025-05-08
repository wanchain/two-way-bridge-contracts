import {JettonMaster,  TonClient} from "@ton/ton";
import {Blockchain} from "@ton/sandbox";
import {Address} from "@ton/core";
import {getJettonBalance} from "./jetton";
import {JettonMinter} from "../JettonMinter";
import {JettonWallet} from "../JettonWallet";
import {IsWanTonClient, WanTonClient} from "../client/client-interface";

export async function CoinBalance(client:WanTonClient|Blockchain, addr:Address) {
    if(IsWanTonClient(client)){
       return await client.getBalance(addr)
    }else{
        return (await client.getContract(addr)).balance
    }
}

export async function TokenBalance(client:WanTonClient|Blockchain, tokenAddr:Address,addr:Address) {
    if(IsWanTonClient(client)){
        return await getJettonBalance(client,tokenAddr,addr)
    }else{
        let jetttonMaster = JettonMinter.createFromAddress(tokenAddr);
        let jetttonMasterOpened = await client.openContract(jetttonMaster)
        let jettonAddr = await jetttonMasterOpened.getWalletAddress(addr)


        let jettonWallet = JettonWallet.createFromAddress(jettonAddr)
        let jettonWalletOpened = await client.openContract(jettonWallet)
        return await jettonWalletOpened.getJettonBalance()
    }
}