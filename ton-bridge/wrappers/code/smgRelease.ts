import {Address} from "@ton/core";
import * as opcodes from "../opcodes";
import {logger} from '../utils/logger';
import {codeTable} from "./encode-decode";
import {bigIntReplacer, formatError, getQueryID, isValidHexString} from "../utils/utils";
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
    bridgeScAddr: string,
}) {
    try {
        if (!isValidHexString(opts.smgID)) {
            throw Error("smgId is not valid hex string")
        }
        if (!Address.isAddress(opts.userAccount)) {
            throw Error("userAccount is not valid address")
        }

        if (!Address.isAddress(opts.bridgeJettonWalletAddr)) {
            throw Error("bridgeJettonWalletAddr is not valid address")
        }

        if (!Address.isAddress(Address.parse(opts.bridgeScAddr))) {
            throw Error("bridgeScAddr is not valid address")
        }

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
    } catch (e) {
        logger.error(formatError(e));
        throw formatError(e);
    }
}