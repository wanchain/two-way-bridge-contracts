import {bigIntReplacer} from "../utils/utils";

import {configTestnet,configMainnet} from "../config/config-ex";
import {
    Address,
    beginCell,
    Builder,
    Cell,
    MessageRelaxed,
    storeMessage,
    Message,
    storeMessageRelaxed,
    external
} from "@ton/core";
import {Maybe} from "@ton/ton/dist/utils/maybe";
import {sign} from "@ton/crypto";
import {getClient, TonClientConfig} from "../client/client";
import {internal} from "@ton/core";
import {StateInit} from "@ton/core";
import {TonClient} from "@ton/ton";
import {WanTonClient} from "../client/client-interface";
import {logger} from '../utils/logger'
export async function buildInternalMessage(from:Address,src: {
    to: Address | string,
    value: bigint | string,
    bounce?: Maybe<boolean>,
    init?: Maybe<StateInit>,
    body?: Maybe<Cell | string>
}){
    let msgRelaxed = await internal(src);
    msgRelaxed.info.src = from;
    return msgRelaxed as unknown as Message;
}

export async function buildExternalMessage(src: {
    to: Address | string,
    init?: Maybe<StateInit>,
    body?: Maybe<Cell>
}){
    return await external(src);
}

export async function buildSignData(args: {
    seqno: number;
    sendMode: number;
    walletId: number;
    messages: Message[];
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
        //signingMessage.storeRef(beginCell().store(storeMessageRelaxed(m)));
        signingMessage.storeRef(beginCell().store(storeMessage(m)));
    }
    return {
        rawData: signingMessage.endCell(),
        hash:signingMessage.endCell().hash(),
        rawDataBuilder:signingMessage,
        msgHashs:await getMsgHash(args.messages),
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

/*
external_message = {
				to: <wallet_sc_address>,
                init?: neededInit,
                body: rawTransactionCell
}
 */
export async function sendRawTransaction(client:WanTonClient, senderAddress:Address,rawTrans:Cell){
    // let client = await getClient();
    let provider =  client.provider(senderAddress)
    await provider.external(rawTrans)


    let externalInMessage = await buildExternalMessage({
        to:senderAddress,
        body:rawTrans,
    })
    return {
        scAddr:senderAddress,
        msgBodyCellHash:rawTrans.hash().toString('hex'),
        externalInMessageHash:beginCell().store(storeMessage(externalInMessage)).endCell().hash().toString('hex'),
    }
}




export function getMsgHash(msgs:Message[]){
    let ret = [];
    for(let m of msgs){
        logger.info("==========msg=>",JSON.stringify(m,bigIntReplacer));
        ret.push(beginCell().store(storeMessage(m)).endCell().hash().toString('hex'));
    }
    return ret;
}