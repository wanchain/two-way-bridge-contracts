import {Address, beginCell, storeMessage, storeMessageRelaxed, Transaction} from "@ton/core";
import {TransactionDescriptionGeneric} from "@ton/core/src/types/TransactionDescription";
import {TransactionComputeVm} from "@ton/core/src/types/TransactionComputePhase";
import {bigIntReplacer, formatError} from "../utils/utils";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";
import {DBAccess} from "../db/DbAccess";
import {convertTranToTonTrans} from "../db/common";
import { MAX_LIMIT } from "../const/const-value";
import {WanTonClient} from "../client/client-interface";
const formatUtil = require('util');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*
return
[
    {
        addr: Address,
        txHash: string,
        gasUsed: bigInt,
        status: boolean,
    },
    ...
]
 */

async function getTranPathInfoByMsgHash(client: WanTonClient, scAddr: Address, msgBodyCellHash:string, msgInHash: string): Promise<TranPathInfo> {
    let pivotTran = await getTranByMsgHash(client, scAddr, msgBodyCellHash,msgInHash);
    let path = await getTranPathInfoByPivotTran(client, scAddr, pivotTran);
    return path;
}

export async function isTranSuccess(tran:Transaction):Promise<boolean>{
    //https://testnet.tonviewer.com/transaction/3a80c94fa62a855ebb47c634f1b42ebd0fdc9ea35ab3f6389bf2c086aac887ef
    let td = tran.description as unknown as TransactionDescriptionGeneric
    // if(td.aborted){
    //     return false
    // }

    let cp = td.computePhase as unknown as TransactionComputeVm
    if( (cp.type == "vm") && (!cp.success || cp.exitCode != 0)){
        return false
    }

    if( td.aborted && cp.type == "vm"){
        return false
    }

    let ap = td.actionPhase
    let apSuccess = ap?.success ? ap.success:true
    if(!apSuccess){
        return false;
    }
    return true;
}

async function computePathGas(path:TranPathInfo):Promise<bigint>{
    let ret = BigInt(0);
    for(let step of path){
        ret += step.gasUsed
    }
    return ret;
}

async function isTranPathSuccess(allTranPathInfo:TranPathInfo):Promise<boolean>{
    let ret = true;
    for(let step of allTranPathInfo){
        if(!step.status){
            return false
        }
    }
    return true;
}


export async function getUpperStepsFromDb(client:WanTonClient,scAddr:Address,tran:Transaction, path:TranPathInfo){
    console.log("getUpperStepsFromDb","tran hash",tran.hash().toString('hex'));
    if(tran.inMessage.info.type == 'external-in'){
        return
    }
    const inMessageCell = beginCell().store(storeMessage( tran.inMessage)).endCell();
    console.log("getUpperStepsFromDb inMessageCell==>","hash",tran.hash().toString('hex'));

    let upperAddress = tran.inMessage.info.src as Address;

    let maxRetry = 5;
    //get from scanned db
    let dbAccess = await DBAccess.getDBAccess();
    if(!dbAccess){
        console.error("not using db cache");
        throw new Error("not using db cache");
    }
    let transFromDb = null;
    let foundInDb = false;
    while(maxRetry-- >0 && !transFromDb){
        try{
            let inDb = await dbAccess?.has(upperAddress.toString());
            if(!inDb){
                await dbAccess?.addDbByName(upperAddress.toString());
                await sleep(2000);
            }
            console.log("getUpperStepsFromDb before dbAccess.getParentTx","tran hash",tran.hash().toString('hex'),"upperAddress",upperAddress.toString());
            transFromDb = await dbAccess?.getParentTx(upperAddress.toString(),convertTranToTonTrans([tran])[0]);
            if(transFromDb){  // found from db
                foundInDb = true;
            }
        }catch(err){
            console.log("getTranByMsgHash from db err",formatError(err),"retry ",maxRetry);
        }
        await sleep(2000);
    }
    if(maxRetry == 0 && !foundInDb){
        throw new Error(`Fail to look for parent. upDb: ${upperAddress.toString()}`)
    }
    if(foundInDb && transFromDb){
        console.log("getUpperStepsFromDB success","hash",tran.hash().toString('hex'),"parent hash",transFromDb.hash().toString('hex'));
        let stepInfoTemp :TranStepInfo = {
            addr:upperAddress as Address,
            txHash:transFromDb.hash().toString('hex'),
            gasUsed:transFromDb.totalFees.coins,
            status:await isTranSuccess(transFromDb),
            lt:transFromDb.lt.toString(),
        }
        path.unshift(stepInfoTemp);

        await getUpperStepsFromDb(client,upperAddress,transFromDb,path);
    }
}

export async function getUpperSteps(client:WanTonClient,scAddr:Address,tran:Transaction, path:TranPathInfo){
    if(tran.inMessage.info.type == 'external-in'){
        return
    }

    try{
        await getUpperStepsFromDb(client,scAddr,tran,path);
        return;
    }catch(err){
        console.log("getUpperStepsFromDb error",formatError(err));
    }

    console.log("getUpperSteps from rpc","scAddr",scAddr,"tran hash",tran.hash().toString('hex'));
    const inMessageCell = beginCell().store(storeMessage( tran.inMessage)).endCell();
    console.log("inMessageCell==>",inMessageCell.toBoc().toString('hex'));
    let tranInMsgHash = inMessageCell.hash().toString('hex');

    let tranInMsgBodyCellHash = tran.inMessage.body.hash().toString('hex');

    let upperAddress = tran.inMessage.info.src as Address;


    let maxTrans = 1000;
    let transChecked = 0;
    let opts:{
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    } = {
        limit: 10,
        archival:true,
    }
    let foundUpper = false
    let transCount = 10;

    while(transChecked<maxTrans && !foundUpper && transCount){
        let retry = 5;
        let status = false;
        let transactions:Transaction[] = [];
        while(--retry > 0  && !status){
            try{
                console.log("getUpperSteps getTransactions ","scAddress",upperAddress,"opts",opts);
                transactions = await client.getTransactions(upperAddress, opts);
                transCount = transactions.length;
                status = true;
                retry = 5;
            }catch(e){
                await sleep(1000);
                console.error(formatError(e))
            }
        }
        if(retry == 0){
            throw(new Error(formatUtil.format("error getUpperSteps getTransactions ","scAddress",upperAddress,"opts",opts)))
        }

        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
            if(i == transactions.length-1) {
                opts.lt = tx.lt.toString(10);
                opts.hash = tx.hash().toString('base64');
            }
            const transactionHash = tx.hash().toString('base64');
            console.log("tx hash is:",i, tx.lt, transactionHash,tx.hash().toString('hex'))
            const outMessages = tx.outMessages;
            let foundInOutMsgs = false;
            for(let outMsgKey of outMessages.keys()){
                let outMsg = outMessages.get(outMsgKey);
                let outMsgHash = beginCell().store(storeMessage(outMsg)).endCell().hash().toString('hex');
                let outMsgBodyHash = outMsg.body.hash().toString('hex');
                console.log("outMsgHash",outMsgHash,"tranInMsgHash",tranInMsgHash,"outMsgBodyHash",outMsgBodyHash,"tranInMsgBodyCellHash",tranInMsgBodyCellHash);
                if (outMsgHash == tranInMsgHash || outMsgBodyHash == tranInMsgBodyCellHash){
                    if((outMsg.info.dest as unknown as Address).equals(scAddr)){
                        if((outMsg.info as unknown as CommonMessageInfoInternal).createdLt == (tran.inMessage.info as unknown as CommonMessageInfoInternal).createdLt){
                            let stepInfoTemp :TranStepInfo = {
                                addr:upperAddress as Address,
                                txHash:tx.hash().toString('hex'),
                                gasUsed:tx.totalFees.coins,
                                status:await isTranSuccess(tx),
                                lt:tx.lt.toString(),
                            }
                            path.unshift(stepInfoTemp);
                            foundInOutMsgs = true;
                            break;
                        }
                    }

                }

            }

            if (foundInOutMsgs){
                console.log("found upper tx",tx.hash().toString('base64'));
                await getUpperSteps(client,upperAddress,tx,path);
                foundUpper = true;
                break; // found the upper tx
            }
        }
        await sleep(2000);
        transChecked += transactions.length;
    }

    if(transChecked>=maxTrans){
        throw new Error("can not found the upper tx!")
    }
}

export async function getLowerSteps(client:WanTonClient,scAddr:Address,tran:Transaction, path:TranPathInfo){
    console.log("Entering getLowerSteps","scAddr",scAddr);
    if(tran.outMessages.keys().length == 0){
        return
    }

    const outMessages = tran.outMessages;
    for(let outMsgKey of outMessages.keys()){
        let outMsg = outMessages.get(outMsgKey);
        let lowerAddr = outMsg.info.dest as Address;
        let msgCellHash = beginCell().store(storeMessage(outMsg)).endCell().hash().toString('hex');
        let msgBodyHash = outMsg.body.hash().toString('hex');
        console.log("===========================before getTranByMsgHash","outMsg",outMsg);
        let lowerTx = await getTranByMsgHash(client,lowerAddr,msgCellHash,msgBodyHash,(outMsg.info as unknown as CommonMessageInfoInternal).createdLt.toString(10));

        let stepInfoTemp :TranStepInfo = {
            addr:lowerAddr as Address,
            txHash:lowerTx.hash().toString('hex'),
            gasUsed:lowerTx.totalFees.coins,
            status:await isTranSuccess(lowerTx),
            lt:lowerTx.lt.toString(),
        }
        path.push(stepInfoTemp);
        await getLowerSteps(client,lowerAddr,lowerTx,path);
    }
}

async function getTranPathInfoByPivotTran(client:WanTonClient,scAddr:Address,pivotTran:Transaction):Promise<TranPathInfo>{
    console.log("Entering getTranPathInfoByPivotTran");
    let allTranPathInfo: TranPathInfo = [];
    let beforePivotTranPathInfo: TranPathInfo = [];
    let afterPivotTranPathInfo: TranPathInfo = [];

    let pivoltTranStepInfo: TranStepInfo = {
        addr: scAddr,
        txHash: pivotTran.hash().toString('hex'),
        gasUsed: pivotTran.totalFees.coins,
        status: await isTranSuccess(pivotTran),
        lt:pivotTran.lt.toString(),
    }

    console.log("Entering get children tx");
    await getLowerSteps(client,scAddr,pivotTran,afterPivotTranPathInfo);   // find children tx //todo check it carefully.
    console.log("End get children tx");

    console.log("Entering get parent tx");
    await getUpperSteps(client,scAddr,pivotTran,beforePivotTranPathInfo);  // find parent tx
    console.log("End get parent tx");

    console.log("[pivoltTranStepInfo]====>",[pivoltTranStepInfo]);
    console.log("[beforePivotTranPathInfo]====>",beforePivotTranPathInfo);
    console.log("[afterPivotTranPathInfo]====>",afterPivotTranPathInfo);
    let ret = allTranPathInfo.concat(beforePivotTranPathInfo,[pivoltTranStepInfo],afterPivotTranPathInfo);
    console.log("========================ret = >", ret);
    return ret;
}

export interface TranStepInfo {
    addr: Address;
    txHash: string;
    gasUsed: bigint;
    status: boolean;
    lt:string;
}

export interface TranResult {
    addr: Address;
    msgInHash: string;
    path:TranPathInfo;
    success: boolean;
    originAddr: Address;
    gasUsed:bigint;
}

export type TranPathInfo = TranStepInfo[]

// example of result
/*
TranResult=> {
        addr: EQCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUI30,
        msgInHash: '8a2fdd9e5508f06c94ff55f0d367fdaaca82207c52ed03008680319b2424bfed',
        path: [
        {
            addr: EQCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUI30,
            txHash: '3bc0e57c110eab0a0ad1d282df89a99f3c2a3aa71fcd27d2ff897bc45febd3bb',
            gasUsed: 2577471n,
            status: true,
            lt: '29498261000001'
        },
        {
            addr: EQBsdoNazbwI9ybbsgufhRocWBPm7emo7cZQxojqzNuvNRcC,
            txHash: '9e4f815609fa16591648b08d186cda0d81175e3a45ee17a91754f83fe013136d',
            gasUsed: 4319392n,
            status: true,
            lt: '29498264000001'
        },
        {
            addr: EQCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUI30,
            txHash: '78b3031ffed07ec7b147f24db7a80e6fda5338d1d9fdbf5e9a845dbcf12de67f',
            gasUsed: 396405n,
            status: true,
            lt: '29498268000001'
        }
    ],
        success: true,
        originAddr: EQCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUI30,
        gasUsed: 7293268n
}
*/
export async function getTranResultByMsgHash(client:WanTonClient,scAddr:Address,msgBodyCellHash:string,msgInHash:string):Promise<TranResult>{

    let path = await getTranPathInfoByMsgHash(client,scAddr,msgBodyCellHash,msgInHash);
    let success = await isTranPathSuccess(path);
    return {
        addr: scAddr,
        msgInHash,
        path,
        success,
        originAddr: path[0].addr,
        gasUsed: await computePathGas(path)
    };
}

export async function getTranResultByTxHash(client:WanTonClient,scAddr:Address,txHash:string, lt:string):Promise<TranResult>{
    let tran = await client.getTransaction(scAddr,lt,txHash);
    let path = await  getTranPathInfoByPivotTran(client,scAddr,tran);

    let success = await isTranPathSuccess(path);
    return {
        addr: scAddr,
        msgInHash:tran.inMessage.body.hash().toString('base64'),
        path,
        success,
        originAddr: path[0].addr,
        gasUsed: await computePathGas(path)
    };
}

export async function getTranResultByTran(client:WanTonClient,scAddr:Address,tran:Transaction):Promise<TranResult>{
    console.log("Entering getTranResultByTran");
    let path = await  getTranPathInfoByPivotTran(client,scAddr,tran);
    let success = await isTranPathSuccess(path);
    return {
        addr: scAddr,
        msgInHash:tran.inMessage.body.hash().toString('base64'),
        path,
        success,
        originAddr: path[0].addr,
        gasUsed: await computePathGas(path)
    };
}


export async function findMsgCellHashInTran(tran:Transaction,msgCellHash:string,msgBodyHash:string,lt:string=''):Promise<Boolean> {
    let found = false;
    const inMessageCell = beginCell().store(storeMessage(tran.inMessage)).endCell();
    let inMessageHash = inMessageCell.hash().toString('hex');
    let inMessageBodyCellHash = tran.inMessage.body.hash().toString('hex');
    let internalMsg = true;
    if(tran.inMessage.info.type == 'external-in'){
        internalMsg = false;
    }
    let inMessageLt = "";
    if(internalMsg){
        inMessageLt = (tran.inMessage.info as unknown as CommonMessageInfoInternal).createdLt.toString(10);
    }

    if(!internalMsg){
        if ((inMessageHash == msgCellHash || inMessageBodyCellHash == msgBodyHash)) {
            found = true;
        }
    }else{
        if ((inMessageHash == msgCellHash || inMessageBodyCellHash == msgBodyHash)) {
            if (lt.length != 0 && (inMessageLt == lt)){
                found =  true;
            }else{
                if(lt.length == 0 ){
                    found = true;
                }
            }
        }
    }

    return found;
}

export async function findOnlyMsgCellHashInTran(tran:Transaction,msgCellHash:string):Promise<Boolean> {
    let found = false;
    const inMessageCell = beginCell().store(storeMessage(tran.inMessage)).endCell();
    let inMessageHash = inMessageCell.hash().toString('hex');
    let inMessageBodyCellHash = tran.inMessage.body.hash().toString('hex');
    let internalMsg = true;
    if(tran.inMessage.info.type == 'external-in'){
        internalMsg = false;
    }
    let inMessageLt = "";
    if(internalMsg){
        inMessageLt = (tran.inMessage.info as unknown as CommonMessageInfoInternal).createdLt.toString(10);
    }

    if(!internalMsg){
        if ((inMessageHash == msgCellHash)) {
            found = true;
        }
    }else{
        if ((inMessageHash == msgCellHash)) {
            found = true;
        }
    }

    return found;
}

export async function getTranByMsgHash(client:WanTonClient, scAddr:Address, msgCellHash:string,msgBodyHash:string,lt:string=''):Promise<Transaction> {
    let limit = MAX_LIMIT;
    let retry = 5
    let maxRetry = retry;
    //get from scanned db
    let dbAccess = await DBAccess.getDBAccess();
    let transFromDb = null;
    while(maxRetry-- >0 && !transFromDb){
        try{
            let inDb = await dbAccess?.has(scAddr.toString());
            if(!inDb){
                await dbAccess.addDbByName(scAddr.toString());
                await sleep(2000);
            }
            transFromDb = await dbAccess?.getTxByMsg(scAddr.toString(),msgCellHash,msgBodyHash,BigInt(lt));
            if(transFromDb){  // found from db
                return transFromDb;
            }
        }catch(err){
            console.error("getTranByMsgHash from db err",formatError(err),"retry ",maxRetry);
        }
        await sleep(2000);
    }

    //get from rpc
    maxRetry = retry;

    let trans = [];
    let transCount = limit;
    let opts: {
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    } = {
        limit,
        archival:true,
    }

    while(transCount){
        let getSuccess = false
        while(maxRetry-- >0 && (!getSuccess)){
            try{
                console.log("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddr,JSON.stringify(opts,bigIntReplacer));
                let ret = await client.getTransactions(scAddr,opts)
                transCount = ret.length;
                console.log("getTransactions success","opts",JSON.stringify(opts,bigIntReplacer),"len of getTransactions",transCount);
                for(let tran of ret){
                    console.log("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
                    let found = await findMsgCellHashInTran(tran,msgCellHash,msgBodyHash,lt);
                    if(found){
                        return tran;
                    }
                }
                if(ret.length){
                    opts.lt = ret[ret.length-1].lt.toString(10);
                    opts.hash = ret[ret.length-1].hash().toString('base64');
                }
                getSuccess = true;
                maxRetry = retry;

            }catch(e){
                console.error("err ",formatError(e));
                await sleep(2000);
            }
        }
        if(maxRetry == 0){
            throw(new Error(formatUtil("getTransactions failed after %d retry. opts is %s",retry,JSON.stringify(opts))));
        }

        await sleep(2000);
    }

}

export async function getTranByOnlyMsgHash(client:WanTonClient, scAddr:Address, msgCellHash:string):Promise<Transaction> {
    let limit = MAX_LIMIT;
    let retry = 5
    let maxRetry = retry;
    //get from scanned db
    let dbAccess = await DBAccess.getDBAccess();
    let transFromDb = null;
    while(maxRetry-- >0 && !transFromDb){
        try{
            let inDb = await dbAccess?.has(scAddr.toString());
            if(!inDb){
                await dbAccess.addDbByName(scAddr.toString());
                await sleep(2000);
            }
            transFromDb = await dbAccess?.getTxByOnlyMsgHash(scAddr.toString(),msgCellHash);
            if(transFromDb){  // found from db
                return transFromDb;
            }
        }catch(err){
            console.error("getTranByMsgHash from db err",formatError(err),"retry ",maxRetry);
        }
        await sleep(2000);
    }

    //get from rpc
    maxRetry = retry;

    let trans = [];
    let transCount = limit;
    let opts: {
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    } = {
        limit,
        archival:true,
    }

    while(transCount){
        let getSuccess = false
        while(maxRetry-- >0 && (!getSuccess)){
            try{
                console.log("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddr,JSON.stringify(opts,bigIntReplacer));
                let ret = await client.getTransactions(scAddr,opts)
                transCount = ret.length;
                console.log("getTransactions success","opts",JSON.stringify(opts,bigIntReplacer),"len of getTransactions",transCount);
                for(let tran of ret){
                    console.log("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
                    let found = await findOnlyMsgCellHashInTran(tran,msgCellHash);
                    if(found){
                        return tran;
                    }
                }
                if(ret.length){
                    opts.lt = ret[ret.length-1].lt.toString(10);
                    opts.hash = ret[ret.length-1].hash().toString('base64');
                }
                getSuccess = true;
                maxRetry = retry;

            }catch(e){
                console.error("err ",formatError(e));
                await sleep(2000);
            }
        }
        if(maxRetry == 0){
            throw(new Error(formatUtil("getTransactions failed after %d retry. opts is %s",retry,JSON.stringify(opts))));
        }

        await sleep(2000);
    }

}