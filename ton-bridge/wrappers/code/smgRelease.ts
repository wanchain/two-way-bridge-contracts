import {Address} from "@ton/core";
import * as opcodes from "../opcodes";
import {logger} from '../utils/logger';
import {codeTable} from "./encode-decode";
import {bigIntReplacer, getQueryID} from "../utils/utils";
import {buildInternalMessage} from "./userLock";

export async function buildSmgReleaseMessage(opts: {
    value: bigint,
    uniqueID: bigint, // userLock hash , hash->bigint
    smgID: string,
    tokenPairID: number,
    releaseValue: bigint,
    fee: bigint,
    userAccount: Address, // userAccount on ton side
    fwTonAmount: bigint,
    totalTonAmount: bigint,
    bridgeJettonWalletAddr: Address,
    e: bigint,
    p: bigint,
    s: bigint,
    queryID?: bigint,
    bridgeScAddr: string
}) {

    logger.info("buildSmgReleaseMessage", "opts", JSON.stringify(opts, bigIntReplacer));
    if (!opts.queryID) {
        opts.queryID = BigInt(await getQueryID());
    }
    let body = codeTable[opcodes.OP_CROSS_SmgRelease].enCode(opts);
    let msg = await buildInternalMessage({to: opts.bridgeScAddr, value: opts.value, body: body, bounce: true});
    return {
        internalMsg: msg,
        body: body,
        to: opts.bridgeScAddr,
        value: opts.value,
    }
}