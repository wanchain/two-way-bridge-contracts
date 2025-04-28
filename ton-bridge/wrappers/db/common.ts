import * as fs from 'fs';
import * as path from 'path';
import {beginCell, Cell, storeMessage, Transaction} from "@ton/core";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";
import {TonTransaction} from "./Db";
import {loadTransaction} from "@ton/core";
import {formatError} from "../utils/utils";

export const DBDataDir = path.join(...[__dirname,"/../data/"]);
console.log("__dirname",__dirname);
console.log("DBDataDir",DBDataDir);

export  function listJsonFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    console.log("files",files);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            listJsonFiles(filePath, fileList);
        } else if (path.extname(filePath) === '.json') {
            fileList.push(file.slice(0,file.length-5));
        }
    }
    return fileList;
}

export function convertTranToTonTrans(trans:Transaction[]){
    let tonTrans:TonTransaction[] = [];
    for(let tran of trans){
        const inMessageCell = beginCell().store(storeMessage(tran.inMessage)).endCell();
        let inMessageHash = inMessageCell.hash().toString('hex');
        let inMessageBodyCellHash = tran.inMessage.body.hash().toString('hex');

        let cii = tran.inMessage.info as unknown as CommonMessageInfoInternal

        let outMsgs:{
            dst:string,
            outMsgHash:string,
            outBodyHash:string,
            createdLt:bigint,
            createAt:bigint,
        }[] = [];
        for(let key of tran.outMessages.keys()){
            let om = tran.outMessages.get(key);
            let ciiOut = om.info as unknown as CommonMessageInfoInternal;

            const outMessageCell = beginCell().store(storeMessage(om)).endCell();
            let outMessageHash = outMessageCell.hash().toString('hex');
            let outMessageBodyCellHash = om.body.hash().toString('hex');

            let outMsg = {
                dst:ciiOut.dest.toString(),
                outMsgHash:outMessageHash,
                outBodyHash:outMessageBodyCellHash,
                createdLt:ciiOut.createdLt,
                createAt:BigInt(ciiOut.createdAt),
            }
            outMsgs.push(outMsg);
        }

        let tonTranTemp:TonTransaction = {
            hash: tran.hash().toString('hex'),// hexString
            lt:tran.lt,
            raw:tran.raw.toBoc().toString('base64'),
            in:{
                src: cii?.src?.toString(),
                inMsgHash:inMessageHash,
                inBodyHash:inMessageBodyCellHash,
                createdLt:cii.createdLt,
                createAt:cii?.createdAt ? BigInt(cii.createdAt):BigInt(0),
            },
            out:outMsgs,
            emitEventOrNot:false,
        }
        tonTrans.push(tonTranTemp);
    }
    return tonTrans;
}

export function convertTonTransToTrans(tonTrans:TonTransaction[]){

    let trans:Transaction[] = [];
    for(let tonTran of tonTrans){
        try{
            let tranCell = Cell.fromBase64(tonTran.raw);
            let tranTemp:Transaction = loadTransaction(tranCell.asSlice());
            trans.push(tranTemp);
        }catch(err){
            console.error("convertTonTransToTrans","tonTran",tonTran,"err",formatError(err));
        }
    }
    return trans;
}