const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {Address, beginCell, Builder, Cell, MessageRelaxed, storeMessageRelaxed} from "@ton/core";
import {Maybe} from "@ton/ton/dist/utils/maybe";
import {sign} from "@ton/crypto";
import {getClient, TonClientConfig} from "../client/client";
import {internal} from "@ton/core";
import {StateInit} from "@ton/core";

export async function buildInternalMessageRelaxed(src: {
    to: Address | string,
    value: bigint | string,
    bounce?: Maybe<boolean>,
    init?: Maybe<StateInit>,
    body?: Maybe<Cell | string>
}){
    return internal(src);
}

export async function buildSignData(args: {
    seqno: number;
    sendMode: number;
    walletId: number;
    messages: MessageRelaxed[];
    timeout?: Maybe<number>;
}){
    // Check number of messages
    if (args.messages.length > 4) {
        throw Error("Maximum number of messages in a single transfer is 4");
    }
    let signingMessage = beginCell()
        .storeUint(args.walletId, 32);
    if (args.seqno === 0) {
        for (let i = 0; i < 32; i++) {
            signingMessage.storeBit(1);
        }
    }
    else {
        signingMessage.storeUint(args.timeout || Math.floor(Date.now() / 1e3) + 60, 32); // Default timeout: 60 seconds
    }
    signingMessage.storeUint(args.seqno, 32);
    signingMessage.storeUint(0, 8); // Simple order
    for (let m of args.messages) {
        signingMessage.storeUint(args.sendMode, 8);
        signingMessage.storeRef(beginCell().store(storeMessageRelaxed(m)));
    }
    return {
        rawData: signingMessage.endCell(),
        hash:signingMessage.endCell().hash(),
        rawDataBuilder:signingMessage
    }
}

export async function signData(hash:Buffer,secretKey:Buffer) {
    return sign(hash,secretKey)}

export async function buildRawTransaction(signature:Buffer, rawDataBuilder:Builder){
    return beginCell()
        .storeBuffer(signature)
        .storeBuilder(rawDataBuilder)
        .endCell();
}

export async function sendRawTransaction(senderAddress:Address,rawTrans:Cell){
    let client = await getClient(config);
    let provider =  client.provider(senderAddress)
    return await provider.external(rawTrans)
}