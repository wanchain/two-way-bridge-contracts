import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

import {logger} from './utils/logger'
const formatUtil = require('util');


export class common {
    static createFromAddress(address: Address) {
        return address;
    }

    static computeHash(currentChainId: bigint,uniqueId:bigint,tokenPairId:bigint,value:bigint,fee:bigint,tokenAccount:Address|string,userAccount: Address) {


        let tokenAccountBuf:Buffer

        if(Address.isAddress(tokenAccount)) {
            tokenAccountBuf = tokenAccount.hash;
        }else{
            tokenAccountBuf = Buffer.from(tokenAccount.substring(0,2).toLowerCase() == '0x'?tokenAccount.substring(2):tokenAccount,'hex');
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
        logger.info(formatUtil.format(" tokenAccount...",tokenAccount));
        logger.info(formatUtil.format(" tokenAccountBuf......",tokenAccountBuf.toString('hex'),tokenAccountBuf.length));
        logger.info(formatUtil.format("(bigInt) tokenAccountBuf......",BigInt("0x" + tokenAccountBuf.toString('hex'))));

        logger.info(formatUtil.format(" userAccount...",userAccount));
        logger.info(formatUtil.format(" userAccountBuf......",userAccountBuf.toString('hex'),userAccountBuf.length));
        logger.info(formatUtil.format("(bigInt) userAccountBuf......",BigInt("0x" + userAccountBuf.toString('hex'))));
        logger.info(formatUtil.format("user_account_cell(cell)",msg.endCell()));
        let hashBuf = msg.endCell().hash();
        return {
            hashHex: hashBuf.toString('hex'),
            hashBig: BigInt(`0x${hashBuf.toString('hex')}`),
            hashBuf: hashBuf
        };
    }
}