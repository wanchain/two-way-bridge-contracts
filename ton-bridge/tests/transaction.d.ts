import { Address } from "@ton/core";
import { SendMessageResult } from "@ton/sandbox";
import { AccountStatus } from "@ton/core/src/types/AccountStatus";
import { HashUpdate } from "@ton/core/src/types/HashUpdate";
import { EventAccountCreated, EventAccountDestroyed, EventMessageSent } from "@ton/sandbox/dist/event/Event";
import { ExternalOutInfo } from "@ton/sandbox/dist/blockchain/Blockchain";
export type TransactionSlim = {
    address: bigint | Address;
    lt: bigint;
    prevTransactionHash: bigint;
    outMessagesCount: number;
    oldStatus: AccountStatus;
    endStatus: AccountStatus;
    inMessage: string;
    outMessages: string;
    totalFees: string;
    stateUpdate: HashUpdate;
    description: string;
    hash: () => Buffer;
};
export type EventSlim = EventAccountCreated | EventAccountDestroyed | EventMessageSent;
export type ExternalOutSlim = {
    info: ExternalOutInfo;
};
export type SendMessageResultSlim = {
    transactions: TransactionSlim[];
    events: EventSlim[];
};
export declare const slimSndMsgResult: (smr: SendMessageResult) => {
    transactions: TransactionSlim[];
    events: import("@ton/sandbox").Event[];
};
