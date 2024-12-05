import {OP_CROSS_SmgRelease} from "../opcodes";
import {Address, beginCell, Cell, SendMode} from "@ton/core";
import * as opcodes from "../opcodes";
import {BIP44_CHAINID,TON_COIN_ACCOUT,TON_COIN_ACCOUNT_STR,WK_CHIANID} from "../const/const-value";

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

            let part4Cell  = beginCell()
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

        }
    },

    OP_TOKENPAIR_Upsert: {
        "enCode": function (opts: any): Cell {
            let toBuffer, fromBuffer
            if(opts.fromChainID == BIP44_CHAINID) {
                if(opts.fromAccount == "") {
                    fromBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let fromAddr = Address.parseFriendly(opts.fromAccount)
                    fromBuffer = fromAddr.address.hash
                }
                toBuffer = Buffer.from(opts.toAccount,'utf8')
            } else if(opts.toChainID == BIP44_CHAINID) {
                if(opts.toAccount == "") {
                    toBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let toAddr = Address.parseFriendly(opts.toAccount)
                    toBuffer = toAddr.address.hash
                }
                fromBuffer = Buffer.from(opts.fromAccount,'utf8')
            } else {
                throw("Error chain ID.")
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
                .storeUint(toBuffer.length, 8)
                .storeRef(beginCell().storeBuffer(fromBuffer).endCell())
                .storeRef(beginCell().storeBuffer(toBuffer).endCell())
                .endCell()
        },
        "deCode": function (cell: Cell): any {

        }
    },
}