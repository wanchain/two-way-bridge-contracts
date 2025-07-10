import {Address, beginCell,} from '@ton/core';

import {logger} from '../utils/logger'
import {add0x, remove0x} from "../utils/utils";

const formatUtil = require('util');

export function computeHash(currentChainId: bigint, uniqueId: bigint, tokenPairId: bigint, value: bigint, fee: bigint, tokenAccount: Address | string, userAccount: Address) {

    let tokenAccountBuf: Buffer

    if (Address.isAddress(tokenAccount)) {
        tokenAccountBuf = tokenAccount.hash;
    } else {
        tokenAccountBuf = Buffer.from(tokenAccount.substring(0, 2).toLowerCase() == '0x' ? tokenAccount.substring(2) : tokenAccount, 'hex');
    }

    let userAccountBuf = userAccount.hash;

    let msg = beginCell()
        .storeUint(currentChainId, 64)
        .storeUint(uniqueId, 256)
        .storeUint(tokenPairId, 32)
        .storeUint(value, 256)
        .storeUint(fee, 256)
        .storeRef(
            beginCell()
                .storeAddress(userAccount)
                .storeBuffer(tokenAccountBuf)
                .endCell()
        );
    logger.info(formatUtil.format("computeHash tokenAccount...", tokenAccount));
    logger.info(formatUtil.format("computeHash tokenAccountBuf......", tokenAccountBuf.toString('hex'), tokenAccountBuf.length));
    logger.info(formatUtil.format("computeHash (bigInt)tokenAccountBuf......", BigInt("0x" + tokenAccountBuf.toString('hex'))));

    logger.info(formatUtil.format("computeHash userAccount...", userAccount));
    logger.info(formatUtil.format("computeHash userAccountBuf......", userAccountBuf.toString('hex'), userAccountBuf.length));
    logger.info(formatUtil.format("(bigInt)computeHash userAccountBuf......", BigInt("0x" + userAccountBuf.toString('hex'))));
    logger.info(formatUtil.format("computeHash user_account_cell(cell)", msg.endCell()));
    let hashBuf = msg.endCell().hash();
    return {
        hashHex: hashBuf.toString('hex'),
        hashBig: BigInt(`0x${hashBuf.toString('hex')}`),
        hashBuf: hashBuf
    };
}

export function getEpsFromMpcSig(fullSig: string) {
    let fullSigNo0x = remove0x(fullSig)
    if (fullSigNo0x.length != 192) {
        throw "invalid length signature"
    }
    return {
        e: BigInt(add0x(fullSigNo0x.slice(0, 64))),
        p: BigInt(add0x(fullSigNo0x.slice(64, 128))),
        s: BigInt(add0x(fullSigNo0x.slice(128, 192))),
        eHex: add0x(fullSigNo0x.slice(0, 64)),
        pHex: add0x(fullSigNo0x.slice(64, 128)),
        sHex: add0x(fullSigNo0x.slice(128, 192))
    }
}
