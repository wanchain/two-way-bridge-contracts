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
        console.log("jacob tokenAccount...",tokenAccount);
        console.log("jacob tokenAccountBuf......",tokenAccountBuf.toString('hex'),tokenAccountBuf.length);
        console.log("(bigInt)jacob tokenAccountBuf......",BigInt("0x" + tokenAccountBuf.toString('hex')));

        console.log("jacob userAccount...",userAccount);
        console.log("jacob userAccountBuf......",userAccountBuf.toString('hex'),userAccountBuf.length);
        console.log("(bigInt)jacob userAccountBuf......",BigInt("0x" + userAccountBuf.toString('hex')));
        console.log("user_account_cell(cell)",msg.endCell());
        let hashBuf = msg.endCell().hash();
        return {
            hashHex: hashBuf.toString('hex'),
            hashBig: BigInt(`0x${hashBuf.toString('hex')}`),
            hashBuf: hashBuf
        };
    }
}