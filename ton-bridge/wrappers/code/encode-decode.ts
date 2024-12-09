import {OP_CROSS_SmgRelease} from "../opcodes";
import {Address, beginCell, Cell, SendMode} from "@ton/core";
import * as opcodes from "../opcodes";
import {BIP44_CHAINID, TON_COIN_ACCOUT, TON_COIN_ACCOUNT_STR, WK_CHIANID} from "../const/const-value";

export const codeTable = {
    OP_CROSS_SmgRelease: {
        "enCode": function (opts: any): Cell {
            console.log("Entering enCode Function OP_CROSS_SmgRelease");
            let part2Cell = beginCell()
                .storeUint(opts.fee, 256)
                .storeAddress(opts.userAccount)
                .endCell();

            let part3Cell = beginCell()
                .storeUint(opts.e, 256)
                .storeUint(opts.p, 256)
                .storeUint(opts.s, 256)
                .endCell();

            let part4Cell = beginCell()
                .storeAddress(opts.jettonAdminAddr)
                .storeAddress(opts.bridgeJettonWalletAddr)
                .endCell();

            return beginCell()
                .storeUint(opcodes.OP_CROSS_SmgRelease, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(BigInt(opts.uniqueID), 256)
                .storeUint(BigInt(opts.smgID), 256)
                .storeUint(opts.tokenPairID, 32)
                .storeUint(opts.releaseValue, 256)
                .storeRef(part2Cell)
                .storeRef(part3Cell)
                .storeRef(part4Cell)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            let slice = cell.beginParse();
            let opCode = slice.loadUint(32);
            let queryID = slice.loadUint(64);
            let uniqueID = slice.loadUint(256);
            let smgID = slice.loadUint(256);
            let tokenPairID = slice.loadUint(32);
            let releaseValue = slice.loadUint(256);

            let part2Slice = slice.loadRef().beginParse();
            let fee = part2Slice.loadUint(256);
            let userAccount = part2Slice.loadAddress();
            part2Slice.endParse();

            let part3Slice = slice.loadRef().beginParse();
            let e = part3Slice.loadUint(256);
            let p = part3Slice.loadUint(256);
            let s = part3Slice.loadUint(256);
            part3Slice.endParse();

            let part4Slice = slice.loadRef().beginParse();
            let jettonAdminAddr = part4Slice.loadAddress();
            let bridgeJettonWalletAddr = part4Slice.loadAddress();
            part4Slice.endParse();

            slice.endParse();
            return {
                opCode,
                queryID,
                uniqueID,
                smgID,
                tokenPairID,
                releaseValue,
                fee,
                userAccount,
                e,
                p,
                s,
                jettonAdminAddr,
                bridgeJettonWalletAddr,
            };
        },
        "emitEvent": function (opts){
            return {
                eventName:"SmgReleaseLogger",
                uniqueID:opts.uniqueID,
                smgID:opts.smgID,
                tokenPairID:opts.tokenPairID,
                value:opts.releaseValue,
                fee:opts.fee,
                userAccount:opts.userAccount,
            }
        }
    },

    OP_FEE_SetTokenPairFee: {
        "enCode": function (opts: any): Cell {
            console.log("Entering enCode Function OP_CROSS_SmgRelease");
            return beginCell()
                .storeUint(opcodes.OP_FEE_SetTokenPairFee, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.srcChainId, 32)
                .storeUint(opts.dstChainId, 32)
                .storeUint(opts.contractFee, 32)
                .storeUint(opts.agentFee, 32)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },

    OP_TOKENPAIR_Upsert: {
        "enCode": function (opts: any): Cell {
            let toBuffer, fromBuffer
            if (opts.fromChainID == BIP44_CHAINID) {
                if (opts.fromAccount == "") {
                    fromBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let fromAddr = Address.parseFriendly(opts.fromAccount)
                    fromBuffer = fromAddr.address.hash
                }
                toBuffer = Buffer.from(opts.toAccount, 'utf8')
            } else if (opts.toChainID == BIP44_CHAINID) {
                if (opts.toAccount == "") {
                    toBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let toAddr = Address.parseFriendly(opts.toAccount)
                    toBuffer = toAddr.address.hash
                }
                fromBuffer = Buffer.from(opts.fromAccount, 'utf8')
            } else {
                throw ("Error chain ID.")
            }
            console.log("fromBuffer,toBuffer:", fromBuffer.toString('hex'), toBuffer.toString('hex'))
            return beginCell()
                .storeUint(opcodes.OP_TOKENPAIR_Upsert, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tokenPairId, 32)
                .storeUint(opts.fromChainID, 32)
                .storeUint(opts.toChainID, 32)
                .storeUint(fromBuffer.length, 8)
                .storeUint(toBuffer.length, 8)
                .storeRef(beginCell().storeBuffer(fromBuffer).endCell())
                .storeRef(beginCell().storeBuffer(toBuffer).endCell())
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            let slice = cell.beginParse();
            let opCode = slice.loadUint(32);
            let queryID = slice.loadUint(64);
            let tokenPairID = slice.loadUint(32);
            let fromChainID = slice.loadUint(32);
            let toChainID = slice.loadUint(32);
            let fromLen = slice.loadUint(8);
            let toLen = slice.loadUint(8);

            let sliceFrom = slice.loadRef().beginParse();
            let fromBuffer = sliceFrom.loadBits(8*fromLen);
            sliceFrom.endParse();

            let sliceTo = slice.loadRef().beginParse();
            let ToBuffer = sliceFrom.loadBits(8*fromLen);
            sliceTo.endParse();

            slice.endParse();

            return {
                opCode,queryID,tokenPairID,fromChainID,toChainID,fromAccount:fromBuffer,toAccount:ToBuffer
            }
        },
        "emitEvent": function(opts){
            return {
                eventName:"AddTokenPair",
                id:opts.tokenPairID,
                fromChainID:opts.fromChainID,
                fromAccount:opts.fromAccount,
                toChainID:opts.toChainID,
                toAccount:opts.toAccount,
            }
        }
    },
}