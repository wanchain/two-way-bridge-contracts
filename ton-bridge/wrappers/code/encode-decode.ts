import {
    OP_CROSS_SmgRelease,
    OP_FEE_SetSmgFeeProxy,
    OP_GROUPAPPROVE_Execute,
    OP_GROUPAPPROVE_Proposol_SetSmgFeeProxy
} from "../opcodes";
import {Address, beginCell, Cell, SendMode} from "@ton/core";
import * as opcodes from "../opcodes";
import {BIP44_CHAINID, TON_COIN_ACCOUT, TON_COIN_ACCOUNT_STR, WK_CHIANID} from "../const/const-value";

import {logger} from '../utils/logger'
import {BufferrToHexString, int64ToByte32} from "../utils/utils";
import {bigIntReplacer} from "../utils/utils";
const formatUtil = require('util');

export const codeTable = {
    [opcodes.OP_CROSS_UserLock]:{
        "enCode": function (opts: any): Cell{
            let retCell = Cell.EMPTY
            return retCell;
        },
        "deCode": function (cell: Cell): any{
            let slice = cell.beginParse();
            let opCode = slice.loadUint(32);
            let queryID = slice.loadUint(64);
            let smgID = slice.loadUint(256);
            let tokenPairID = slice.loadUint(32);
            let crossValue = slice.loadUint(256);

            let dstUserAccountLen = slice.loadUint(8);
            let dstUserAccountBuff = slice.loadBuffer(dstUserAccountLen);

            let extraCell = slice.loadRef().beginParse();
            let addrTokenAccount = extraCell.loadAddress();
            let jwAddrSrc = extraCell.loadAddress();
            let jwAddrBridgeSc = extraCell.loadAddress();
            extraCell.endParse();

            slice.endParse();

            return {
                smgID:int64ToByte32(BigInt(smgID)),
                tokenPairID,
                crossValue,
                dstUserAccount: dstUserAccountBuff.toString('hex'),
                addrTokenAccount: addrTokenAccount.toString(),
                jwAddrSrc,
                jwAddrBridgeSc
            }
        },
        "emitEvent": function (opts){
            return {
                eventName:"UserLockLogger",
                uniqueID:opts.uniqueID,
                smgID:opts.smgID,
                tokenPairID:opts.tokenPairID,
                value:opts.releaseValue,
                fee:opts.fee,
                userAccount:opts.userAccount,
                txHashBase64:opts.txHashBase64,
                txHash:opts.txHash,
                lt:opts?.lt,
                from:opts?.origin,
                prevTransactionHash:opts?.prevTransactionHash,
                prevTransactionLt:opts?.prevTransactionLt,
            }
        }
    },
    [opcodes.OP_CROSS_SmgRelease]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_CROSS_SmgRelease"));
            logger.info(formatUtil.format("op_cross_smgRelease opts %s",JSON.stringify(opts,bigIntReplacer)));
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
                .storeAddress(opts.bridgeJettonWalletAddr)
                .storeUint(opts.fwTonAmount,256)
                .storeUint(opts.totalTonAmount,256)
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
                txHashBase64:opts.txHashBase64,
                txHash:opts.txHash,
                lt:opts?.lt,
            }
        }
    },
    [opcodes.OP_FEE_SetTokenPairFee]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_CROSS_SmgRelease"));
            return beginCell()
                .storeUint(opcodes.OP_FEE_SetTokenPairFee, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tokenPairID, 32)
                .storeUint(opts.fee, 32)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_FEE_SetSmgFeeProxy]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_FEE_SetSmgFeeProxy"));
            return beginCell()
                .storeUint(opcodes.OP_FEE_SetSmgFeeProxy, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.feeProxy)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_SetSmgFeeProxy]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_SetSmgFeeProxy"));
            let msg = beginCell()
                .storeUint(opcodes.OP_FEE_SetSmgFeeProxy, 32) // op (op #1 = increment)
                .storeAddress(opts.feeProxy)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_AddCrossAdmin]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_AddCrossAdmin"));
            let msg = beginCell()
                .storeUint(opcodes.OP_FEE_AddCrossAdmin, 32) // op (op #1 = increment)
                .storeAddress(opts.admin)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_DelCrossAdmin]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_AddCrossAdmin"));
            let msg = beginCell()
                .storeUint(opcodes.OP_FEE_DelCrossAdmin, 32) // op (op #1 = increment)
                .storeAddress(opts.admin)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TransferOwner]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_AddCrossAdmin"));
            let msg = beginCell()
                .storeUint(opcodes.OP_COMMON_TransferOwner, 32) // op (op #1 = increment)
                .storeAddress(opts.owner)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TransferOperator]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TransferOperator"));
            let msg = beginCell()
                .storeUint(opcodes.OP_FEE_SetFeeOperator, 32) // op (op #1 = increment)
                .storeAddress(opts.operator)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_SetHalt]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_AddCrossAdmin"));
            let msg = beginCell()
                .storeUint(opcodes.OP_COMMON_SetHalt, 32)
                .storeUint(opts.halt, 2)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TOKENPAIR_Upsert]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TOKENPAIR_Upsert"));
            let toBuffer, fromBuffer
            if(opts.fromChainID == BIP44_CHAINID) {
                let fromAddr = Address.parseFriendly(opts.fromAccount)
                fromBuffer = fromAddr.address.hash
                toBuffer = Buffer.from(opts.toAccount.startsWith("0x")?opts.toAccount.slice(2):opts.toAccount,'hex')
            } else if(opts.toChainID == BIP44_CHAINID) {
                let toAddr = Address.parseFriendly(opts.toAccount)
                toBuffer = toAddr.address.hash
                fromBuffer = Buffer.from(opts.fromAccount.startsWith("0x")?opts.fromAccount.slice(2):opts.fromAccount,'hex')
            } else {
                throw("Error chain ID.")
            }
            let jettonAdminAddr = Address.parseFriendly(opts.jettonAdminAddr)
            let jettonAdminAddrBuffer = jettonAdminAddr.address.hash
            logger.info(formatUtil.format("fromBuffer,toBuffer:", fromBuffer.toString('hex'), toBuffer.toString('hex')));

            let msg = beginCell()
                .storeUint(opcodes.OP_TOKENPAIR_Upsert, 32)
                .storeUint(opts.tokenPairId, 32)
                .storeUint(opts.fromChainID, 32)
                .storeUint(opts.toChainID, 32)
                .storeUint(fromBuffer.length, 8)
                .storeUint(toBuffer.length, 8)
                .storeBuffer(jettonAdminAddrBuffer)
                .storeRef(beginCell().storeBuffer(fromBuffer).endCell())
                .storeRef(beginCell().storeBuffer(toBuffer).endCell())
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TOKENPAIR_Remove]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TOKENPAIR_Remove"));
            let msg = beginCell()
                .storeUint(opcodes.OP_TOKENPAIR_Remove, 32) // op (op #1 = increment)
                .storeUint(opts.tokenPairId, 32)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TranferFoundation]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TranferFoundation"));
            let msg = beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_TranferFoundation, 32) // op (op #1 = increment)
                .storeAddress(opts.foundation)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_TransferOracleAdmin]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TransferOracleAdmin"));
            let msg = beginCell()
                .storeUint(opcodes.OP_ORACLE_TransferOracleAdmin, 32) // op (op #1 = increment)
                .storeAddress(opts.oracleAdmin)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Proposol_UpgradeSc]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Proposol_TranferFoundation"));
            let msg = beginCell()
                .storeUint(opcodes.OP_UPGRADE_Code, 32) // op (op #1 = increment)
                .storeRef(opts.code)
                .endCell()
            return beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_GROUPAPPROVE_Execute]: {
        "enCode": function (opts: any): Cell {
            logger.info(formatUtil.format("Entering enCode Function OP_GROUPAPPROVE_Execute"));

            let proof = beginCell()
                .storeUint(opts.e, 256)
                .storeUint(opts.p, 256)
                .storeUint(opts.s, 256)
                .endCell();
            return beginCell()
                    .storeUint(opcodes.OP_GROUPAPPROVE_Execute, 32)
                    .storeUint(opts.queryID ?? 0, 64)
                    .storeUint(opts.smgId, 256)
                    .storeUint(opts.taskId,64)
                    .storeRef(proof)
                    .endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_FEE_SetTokenPairFees]: {
        "enCode": function (opts: any): Cell {
            console.log("Entering enCode Function OP_CROSS_SmgReleases");
            let count = opts.tokenPairID.length
            let data = beginCell()
            .storeUint(opcodes.OP_FEE_SetTokenPairFees, 32)
            .storeUint(opts.queryID ?? 0, 64)
            .storeUint(count, 32)
            for(let i=0; i<count; i++) {
                data.storeUint(opts.tokenPairID[i], 32)
                .storeUint(opts.fee[i], 32)
            }
            return data.endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_FEE_SetChainFee]: {
        "enCode": function (opts: any): Cell {
            console.log("Entering enCode Function OP_FEE_SetChainFees");
            return beginCell()
                .storeUint(opcodes.OP_FEE_SetChainFee, 32)
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
    [opcodes.OP_FEE_SetChainFees]: {
        "enCode": function (opts: any): Cell {
            console.log("Entering enCode Function OP_FEE_SetChainFee");
            let count = opts.srcChainId.length

            let data =  beginCell()
                .storeUint(opcodes.OP_FEE_SetChainFees, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(count, 32)
            for(let i=0; i<count; i++) {
                data.storeUint(opts.srcChainId[i], 32)
                .storeUint(opts.dstChainId[i], 32)
                .storeUint(opts.contractFee[i], 32)
                .storeUint(opts.agentFee[i], 32)
            }

            return data.endCell()
        },
        "deCode": function (cell: Cell): any {
            return 0;
        }
    },
    [opcodes.OP_TOKENPAIR_Upsert]: {
        "enCode": function (opts: any): Cell {
            let toBuffer, fromBuffer;
            if (opts.fromChainID == BIP44_CHAINID) {
                if (opts.fromAccount == "") {
                    fromBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let fromAddr = Address.parseFriendly(opts.fromAccount)
                    fromBuffer = fromAddr.address.hash
                }
                toBuffer = Buffer.from(opts.toAccount.startsWith("0x")?opts.toAccount.substring(2):opts.toAccount, 'hex')

            } else if (opts.toChainID == BIP44_CHAINID) {
                if (opts.toAccount == "") {
                    toBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
                } else {
                    let toAddr = Address.parseFriendly(opts.toAccount)
                    toBuffer = toAddr.address.hash
                }
                fromBuffer = Buffer.from(opts.fromAccount.startsWith("0x")?opts.fromAccount.substring(2):opts.fromAccount, 'hex')
            } else {
                throw ("Error chain ID.")
            }

            let jettonAdminBuffer;
            if (opts.jettonAdminAddr == "") {
                jettonAdminBuffer = Buffer.from(TON_COIN_ACCOUT.slice(2), 'hex')
            } else {
                jettonAdminBuffer = Address.parseFriendly(opts.jettonAdminAddr).address.hash
            }

            logger.info(formatUtil.format("fromBuffer,toBuffer:", fromBuffer.toString('hex'), toBuffer.toString('hex')));
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
                .storeBuffer(jettonAdminBuffer)
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
            let toLength = slice.loadUint(8);

            let sliceFrom = slice.loadRef().beginParse();
            let fromBuffer = sliceFrom.loadBits(8*fromLen);
            sliceFrom.endParse();
            logger.info(formatUtil.format("fromBuffer=>",fromBuffer));

            let sliceTo = slice.loadRef().beginParse();
            let toBuffer = sliceTo.loadBits(8*toLength);
            sliceTo.endParse();
            logger.info(formatUtil.format("toBuffer=>",toBuffer));
            let jettonAdmin = slice.loadBits(256)
            slice.endParse();

            return {
                opCode,queryID,tokenPairID,fromChainID,toChainID,fromAccount:fromBuffer,toAccount:toBuffer,jettonAdmin:jettonAdmin
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
                txHashBase64:opts.txHashBase64,
                txHash:opts.txHash,
                lt:opts?.lt,
            }
        }
    },
    [opcodes.OP_TOKENPAIR_Remove]: {
        "enCode": function (opts: any): Cell {
            return beginCell()
                .storeUint(opcodes.OP_TOKENPAIR_Remove, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tokenPairId, 32)
                .endCell();
        },
        "deCode": function (cell: Cell): any {
            let slice = cell.beginParse();
            let opCode = slice.loadUint(32);
            let queryID = slice.loadUint(64);
            let tokenPairID = slice.loadUint(32);
            slice.endParse();

            return {
                opCode,queryID,tokenPairID
            }
        },
        "emitEvent": function(opts){
            return {
                eventName:"RemoveTokenPair",
                id:opts.tokenPairID,
                txHashBase64:opts.txHashBase64,
                txHash:opts.txHash,
                lt:opts?.lt,
            }
        }
    }
}