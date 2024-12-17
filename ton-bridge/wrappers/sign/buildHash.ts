import {
    Address,
    beginCell,
} from '@ton/core';

import {logger} from '../utils/logger'
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
    logger.info(formatUtil.format("jacob tokenAccount...", tokenAccount));
    logger.info(formatUtil.format("jacob tokenAccountBuf......", tokenAccountBuf.toString('hex'), tokenAccountBuf.length));
    logger.info(formatUtil.format("(bigInt)jacob tokenAccountBuf......", BigInt("0x" + tokenAccountBuf.toString('hex'))));

    logger.info(formatUtil.format("jacob userAccount...", userAccount));
    logger.info(formatUtil.format("jacob userAccountBuf......", userAccountBuf.toString('hex'), userAccountBuf.length));
    logger.info(formatUtil.format("(bigInt)jacob userAccountBuf......", BigInt("0x" + userAccountBuf.toString('hex'))));
    logger.info(formatUtil.format("user_account_cell(cell)", msg.endCell()));
    let hashBuf = msg.endCell().hash();
    return {
        hashHex: hashBuf.toString('hex'),
        hashBig: BigInt(`0x${hashBuf.toString('hex')}`),
        hashBuf: hashBuf
    };
}
