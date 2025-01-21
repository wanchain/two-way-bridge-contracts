
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
import {CommonMessageInfo} from "@ton/core/src/types/CommonMessageInfo";

const JSONbig = require('json-bigint');

export type TransactionSlim = {
    address: bigint|Address,
    lt: bigint,
    prevTransactionHash: bigint,
    //prevTransactionLt: bigint,
    //now: number,
    outMessagesCount: number,
    oldStatus: AccountStatus,
    endStatus: AccountStatus,
    inMessage: string,
    outMessages: string;
    totalFees: string,
    stateUpdate: HashUpdate,
    description: string,
    //raw: Cell,
    hash: () => Buffer,
};

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

export const slimSndMsgResult = (smr :SendMessageResult) => {
    let trans:TransactionSlim[] = [];
    for(let tran of smr.transactions){
        let tranSlim ={
            address: BigToAddress(tran.address),
            lt: tran.lt,
            prevTransactionHash: tran.prevTransactionHash,
            outMessagesCount: tran.outMessagesCount,
            oldStatus: tran.oldStatus,
            endStatus: tran.endStatus,
            inMessage: JSONbig.stringify(tran.inMessage.info),
            outMessages: JSONbig.stringify(tran.outMessages),
            totalFees: JSONbig.stringify(tran.totalFees),
            stateUpdate: tran.stateUpdate,
            description: JSONbig.stringify(tran.description),
            hash: tran.hash,
        }
        trans.push(tranSlim);
    }
    return {
        transactions:trans,
        events:smr.events,
    }
};