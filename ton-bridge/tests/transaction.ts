
import {Address, toNano, fromNano, StateInit, Transaction} from "@ton/core";
import {SendMessageResult} from "@ton/sandbox";
import {AccountStatus} from "@ton/core/src/types/AccountStatus";
import {Maybe} from "@ton/core/src/utils/maybe";
import {Message} from "@ton/core/src/types/Message";
import {Dictionary} from "@ton/core/src/dict/Dictionary";
import {CurrencyCollection} from "@ton/core/src/types/CurrencyCollection";
import {HashUpdate} from "@ton/core/src/types/HashUpdate";
import {TransactionDescription} from "@ton/core/src/types/TransactionDescription";
import {Cell} from "@ton/core/src/boc/Cell";
import {EventAccountCreated, EventAccountDestroyed, EventMessageSent} from "@ton/sandbox/dist/event/Event";
import {ExternalOutInfo} from "@ton/sandbox/dist/blockchain/Blockchain";
import {CommonMessageInfo} from "@ton/core";

const JSONbig = require('json-bigint');

export type TransactionSlim = any;

export type EventSlim = EventAccountCreated | EventAccountDestroyed | EventMessageSent;

export type ExternalOutSlim = {
    info: ExternalOutInfo;
    /*init?: StateInit;
    body: Cell;*/
};

export type SendMessageResultSlim = {
    transactions: TransactionSlim[];
    events: EventSlim[];
}


function BigToAddress(big:bigint):Address{
    let bufHash = bigIntToBuffer(big);

    return new Address(0,bufHash);
}

function bigIntToBuffer(big:bigint) {
    let buffer = Buffer.from(big.toString(16),'hex')
    let bufferLeft = Buffer.alloc(32-buffer.length);
    return Buffer.concat([bufferLeft,buffer]);
}


export function bufferToBigInt(buffer: Buffer, isBigEndian = true): bigint {
    let result = 0n;
    const bytes = isBigEndian ? buffer : [...buffer].reverse();
    for (const byte of bytes) {
        result = (result << 8n) | BigInt(byte);
    }
    return result;
}

export function AddressToBig(addr:Address){
    let hash = addr.hash;
    return bufferToBigInt(hash);
}

export const slimSndMsgResult = (smr :SendMessageResult) => {
    console.log("Entering slimSndMsgResult....................................");
    let trans:TransactionSlim[] = [];
    for(let tran of smr.transactions){
        // let tranSlim ={
        //     address: BigToAddress(tran.address),
        //     lt: tran.lt,
        //     prevTransactionHash: tran.prevTransactionHash,
        //     outMessagesCount: tran.outMessagesCount,
        //     oldStatus: tran.oldStatus,
        //     endStatus: tran.endStatus,
        //     inMessage: JSONbig.stringify(tran.inMessage.info),
        //     outMessages: JSONbig.stringify(tran.outMessages),
        //     totalFees: JSONbig.stringify(tran.totalFees),
        //     stateUpdate: tran.stateUpdate,
        //     description: JSONbig.stringify(tran.description),
        //     hash: tran.hash,
        // }
        //const {address,description,debugLogs,vmLogs,...filtered} = tran;

        trans.push({
            address: BigToAddress(tran.address),
            addressBig:tran.address,
            description:JSONbig.stringify(tran.description),
            debugLogs:tran.debugLogs,
            vmLogs:tran.vmLogs,
        });
    }
    return {
        transactions:trans,
        events:smr.events,
    }
};
