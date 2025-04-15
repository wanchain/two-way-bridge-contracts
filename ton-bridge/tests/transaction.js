"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slimSndMsgResult = void 0;
const core_1 = require("@ton/core");
const JSONbig = require('json-bigint');
function BigToAddress(big) {
    let bufHash = bigIntToBuffer(big);
    return new core_1.Address(0, bufHash);
}
function bigIntToBuffer(big) {
    let buffer = Buffer.from(big.toString(16), 'hex');
    let bufferLeft = Buffer.alloc(32 - buffer.length);
    return Buffer.concat([bufferLeft, buffer]);
}
const slimSndMsgResult = (smr) => {
    let trans = [];
    for (let tran of smr.transactions) {
        let tranSlim = {
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
        };
        trans.push(tranSlim);
    }
    return {
        transactions: trans,
        events: smr.events,
    };
};
exports.slimSndMsgResult = slimSndMsgResult;
