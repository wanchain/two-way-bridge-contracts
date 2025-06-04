import {Address, Cell, Transaction} from "@ton/core";
import {codeTable} from "../code/encode-decode";

import {logger} from '../utils/logger'
import {getTranResultByTran} from "../transResult/transResult";
const formatUtil = require('util');
import * as opcodes from "../opcodes";
import {
    bigIntReplacer,
    formatError,
    sleep,
    toBase64
} from "../utils/utils";

import {MAX_LIMIT, MAX_RETRY, RETRY_INTERNAL_TIME} from "../const/const-value";
import {DBAccess} from "../db/DbAccess";
import {IsWanTonClient, WanTonClient} from "../client/client-interface";

export async function getEvents(client: WanTonClient,scAddress:string,limit:number,lt?:string,to_lt?:string,eventName?:string,hash?:string):Promise<any> {

    logger.info("scAddress:%s,limit:%s,lt:%s,to_lt:%s,eventName:%s",scAddress,limit,lt,to_lt,eventName);
    if (!client){
        throw new Error("client does not exist");
    }
    if (!Address.isAddress(Address.parse(scAddress))){
        throw new Error("scAddress is invalid");
    }
    if(limit>MAX_LIMIT){
        throw new Error("limit is more than MAX_LIMIT(1000)");
    }

    let events = [];
    let trans = [];

    trans = await getTransactions(client,scAddress,{limit,lt,to_lt,archival:true});

    for(let tran of trans){
        logger.info(formatUtil.format("tran=>",tran.hash().toString('base64')));
        let event = await getEventFromTran(client,tran,scAddress);
        if(event != null){
            logger.info("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!==found event==!!!!!!!!!!!!!!!!!!!!!!!!!!!",event);
            if(eventName && event.eventName.toLowerCase() != eventName.toLowerCase()){
                continue;
            }
            events.push(event);
        }
    }
    return events;
}

export async function getTransactions(client:WanTonClient,scAddress:string,opts:{
    limit: number;
    lt?: string;
    hash?: string;
    to_lt?: string;
    inclusive?: boolean;
    archival?: boolean;
}):Promise<any> {
    logger.info("getTransactions opts = %s",opts);
    let ret = await getTransactionsFromDb(client, scAddress, opts);
    if(ret && ret.length != 0){
        return ret;
    }

    logger.info("getTransactions from RPC server opts = %s",opts);
    let scAddr = Address.parse(scAddress);
    logger.info(formatUtil.format("contractAddr=>",scAddress));
    try{
        ret = await client.getTransactions(scAddr,opts)
    }catch(err){
        logger.error(formatError(err),"getTransactions from RPC server opts = %s",opts);
    }
    return ret;
}

async function getTransactionsFromDb(client:WanTonClient,scAddress:string,opts:{
    limit: number;
    lt?: string;
    hash?: string;
    to_lt?: string;
    inclusive?: boolean;
    archival?: boolean;
}):Promise<any> {
    logger.info("getTransactionsFromDb opts = %s",opts);
    let scAddr = Address.parse(scAddress);
    logger.info(formatUtil.format("contractAddr=>",scAddress));

    let dbAccess = await DBAccess.getDBAccess();
    if(!dbAccess){
        logger.error("not using db cache","getTransactionsFromDb opts = %s",opts);
        return null;
    }
    let retTx = null;
    let retry = MAX_RETRY;
    while(retry-- > 0 && !retTx){
        try{
            if(!dbAccess?.has(scAddress)){
                await dbAccess.addDbByName(scAddress);
            }
            retTx = await dbAccess?.getTxsByLtRange(scAddress,opts.lt?BigInt(opts.lt):BigInt(0),opts.to_lt?BigInt(opts.to_lt):BigInt(0))
        }catch(err){
            logger.error("getTxsByLtRange err",formatError(err),"retry",retry,"dbName","scAddress",scAddress,"opts",opts)
        }
        await sleep(10000);
    }
    logger.info("getTransactionsFromDb success","scAddress",scAddress,"lt",opts.lt,"tranHash",opts.hash,"retTx",retTx);
    return retTx
}

export async function getAllTransactions(client:WanTonClient,scAddress:string,limit:number, retry:number){
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
    let maxRetry = retry;
    while(transCount){
        let getSuccess = false
        while(maxRetry-- >0 && (!getSuccess)){
           try{
               logger.info("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddress,JSON.stringify(opts,bigIntReplacer));
               let ret = await client.getTransactions(Address.parse(scAddress),opts)
               transCount = ret.length;
               logger.info("getAllTransactions getTransactions success from rpc","opts",JSON.stringify(opts,bigIntReplacer),"len of getTransactions",transCount,"scAddress",scAddress);
               for(let tran of ret){
                   logger.info("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
                   trans.push(tran);
               }
               if(ret.length){
                   opts.lt = ret[ret.length-1].lt.toString(10);
                   opts.hash = ret[ret.length-1].hash().toString('base64');
               }
               getSuccess = true;
               maxRetry = retry;
           }catch(e){
               logger.error("err ",formatError(e),"getAllTransactions getTransactions success from rpc","opts",JSON.stringify(opts,bigIntReplacer),"scAddress",scAddress);
               await sleep(2000);
           }
        }
        if(maxRetry == 0){
            throw(new Error(formatUtil("getTransactions failed after %d retry. opts is %s",retry,JSON.stringify(opts))));
        }

        await sleep(2000);
    }
    logger.info("getAllTransactions success");
    return trans;
}

export async function getEventFromTran(client:WanTonClient,tran:Transaction, scAddress:string){
    logger.info("getEventFromTran entering","client is WanTonClient",IsWanTonClient(client));
    let bodyCell = tran.inMessage?.body;
    if(!bodyCell){
        logger.error("body is empty","tran",tran.hash().toString("base64"));
        return null;
    }
    try{
        let opCode = await getOpCodeFromCell(bodyCell);
        logger.info(formatUtil.format("opCode=>",opCode.toString(16)));
        logger.info(formatUtil.format("codeTable[opCode]=>",codeTable[opCode]));
        if(!codeTable[opCode]){
            logger.error("opCode is empty","tran","opCode",opCode.toString(16),tran.hash().toString("base64"));
            return null;
        }
        logger.info("before decode bodyCell");
        let decoded = await codeTable[opCode]["deCode"](bodyCell);
        logger.info("after decode bodyCell");
        decoded.txHashBase64 = tran.hash().toString("base64");
        decoded.txHash = tran.hash().toString("hex");

        decoded.lt = tran.lt;
        decoded.prevTransactionHash = tran.prevTransactionHash
        decoded.prevTransactionLt = tran.prevTransactionLt

        // handle userLock
        if(opCode == opcodes.OP_CROSS_UserLock){
            logger.info(formatUtil.format("getEventFromTran OP_CROSS_UserLock"));
            logger.info("getEventFromTran before handleUserLockEvent","client is WanTonClient",IsWanTonClient(client));
            let handleResult = await handleUserLockEvent(client,Address.parse(scAddress),tran)
            if (!handleResult.valid){
                logger.error(formatUtil.format("handleResult OP_CROSS_UserLock is not valid","tran.hash",tran.hash().toString("base64")));
                return null;
            }
            decoded.origin = handleResult.origin;
        }else{
            let handleResult = await handleCommonEvent(client,Address.parse(scAddress),
                tran)
            if (!handleResult.valid){
                logger.error(formatUtil.format("handleResult handleCommonEvent is not valid","tran.hash",tran.hash().toString("base64")));
                return null;
            }
            decoded.origin = handleResult.origin;
        }

        return await codeTable[opCode]["emitEvent"](decoded);
    }catch(err){
        logger.error(formatUtil.format("getEventFromTran err",formatError(err)),"tran.hash",tran.hash().toString("base64"));
        return null;
    }
}

export async function getTransaction(client:WanTonClient,scAddress:string,lt:string,tranHash:string){
    logger.info("Entering getTransaction","scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
    let retTranFromDb = await getTransactionFromDb(client,scAddress,lt,toBase64(tranHash));
    if(retTranFromDb){
        logger.info("getTransaction success","getTransactionFromDb","retTranFromDb",retTranFromDb.hash().toString("base64"));
        return retTranFromDb;
    }
    logger.info("getTransaction","getTransaction from rpc","scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
    let tran:Transaction;
    let trans:Transaction[] = [];
    let retry = 2
    let status = false;
    let foundTran = false;

    let maxTrans = 1000;
    let transChecked = 0;

    while(retry-- > 0){
        try{
            logger.info("before client.getTransaction","scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
            tran = await client.getTransaction(Address.parse(scAddress),lt,toBase64(tranHash)); //  cannot compute block with specified transaction: cannot find block (0,e56031f43e6493da) lt=33028010000003: lt not in db'
            logger.info("client.getTransaction success", "scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash),"tran = > ",tran);
            return tran;
        }catch(err){
            logger.error("getTransaction","client.getTransaction error",formatError(err),"scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
            await sleep(2000);
        }
    }

    retry = MAX_RETRY;
    let opts:{
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    } = {
        limit: MAX_LIMIT,
        archival:true,
    }


    while(transChecked<maxTrans && !foundTran){
        status = false;
        while(--retry > 0 && !status){
            try{

                logger.info("getTransactions","scAddress",scAddress,"opts",opts);
                trans = await client.getTransactions(Address.parse(scAddress),opts);
                status = true;
                retry = MAX_RETRY;
            }catch(err){
                logger.error(formatError(err),"getTransactions","scAddress",scAddress,"opts",opts)
                await sleep(2000);
            }
        }
        if(retry == 0){
            throw(new Error(formatUtil.format("getTransactions ","scAddress",scAddress,"opts",opts)))
        }
        if(trans.length == 0){
            break;
        }
        for (let i=0; i<trans.length; i++) {
            let tx = trans[i]
            if(i == trans.length-1) {
                opts.lt = tx.lt.toString(10);
                opts.hash = tx.hash().toString('base64');
            }
            logger.info("getTransactions from rpc","i",i,"txHash",tx.hash().toString("base64"));
            if(tx.hash().toString('base64') == toBase64(tranHash)){
                tran = tx;
                foundTran = true;
                break;
            }
        }

        await sleep(2000);
        transChecked += trans.length;
    }
    if(foundTran){
        return tran;
    }
    throw(new Error(formatUtil.format("can not getTransactions ","scAddress",scAddress,"opts",opts)),"hash",tranHash,"hash(bse64)",toBase64(tranHash));
}
// tranHash: base64
export async function getTransactionFromDb(client:WanTonClient,scAddress:string,lt:string,tranHash:string){
    logger.info("Entering getTransactionFromDb","scAddress",scAddress,"lt",lt,"tranHash",tranHash);
    let dbAccess = await DBAccess.getDBAccess();
    if(!dbAccess){
        logger.error("not using db cache");
        return null;
    }
    let retTx = null;
    let retry = MAX_RETRY;
    while(retry-- > 0 && !retTx){
        try{
            if(!dbAccess?.has(scAddress)){
                await dbAccess.addDbByName(scAddress);
            }
            retTx = await dbAccess?.getTxByHashLt(scAddress,tranHash,lt)
        }catch(err){
            logger.error("getTxByHashLt err",formatError(err),"retry",retry,"dbName","scAddress",scAddress,"hash",tranHash)
            await sleep(RETRY_INTERNAL_TIME);
        }
    }
    logger.info("getTransactionFromDb success","scAddress",scAddress,"lt",lt,"tranHash",tranHash,"retTx",retTx);
    return retTx
}

export async function getEventByTranHash(client:WanTonClient, scAddress:string, lt:string, tranHash:string){
    logger.info("entering getEventByTranHash getTransaction success","tranHash ",tranHash,"lt",lt,"dbName",scAddress);
    let tran = await getTransaction(client,scAddress,lt,tranHash);
    logger.info("getEventByTranHash getTransaction success",tran, "tranHash ",tran.hash().toString('hex'));
    logger.info("getEventByTranHash before getEventFromTran","client is WanTonClient",IsWanTonClient(client));
    return await getEventFromTran(client,tran,scAddress);
}

export async function getOpCodeFromCell(cell:Cell){
    if(cell.equals(Cell.EMPTY)){
        throw new Error("empty cell");
    }
    let slice = cell.beginParse();
    try{
        return slice.preloadUint(32);
    }catch(err){
        logger.error(formatUtil.format("getOpCodeFromCell(err)=>",formatError(err)));
        throw new Error("no opCode find");
    }
}
/*
{
    valid: true|false,  // used the trans tree is valid
    origin: Address,    // from address, who trigger the lock event.
}
 */

async function handleUserLockEvent(client:WanTonClient, scAddr:Address,tran:Transaction){
    return handleCommonEvent(client,scAddr,tran);
}

async function handleCommonEvent(client:WanTonClient, scAddr:Address,tran:Transaction){

    logger.info(formatUtil.format("Entering handleCommonEvent"));

    let transResult  = await getTransResult(client,scAddr,tran);
    if (!transResult.success){
        logger.error("the trans tree is not success","tran.hash",tran.hash().toString('base64'))
        return {
            valid:false,
            origin:transResult.originAddr.toString()
        }
    }
    logger.info(formatUtil.format("Ending handleCommonEvent"),"tran.hash",tran.hash().toString('base64'));
    return {
        valid:true,
        origin:transResult.originAddr.toString()
    }
}

async function decodeUserLock(bodyCell:Cell){
    let bodySlice = bodyCell.asSlice();
    let queryId,dstUserAccount,addrTokenAccount,jwAddrSrc,jwAddrBridgeSc,opCode,smgID,tokenPairID,crossValue;
    opCode = bodySlice.loadUint(32)
    queryId = bodySlice.loadUint(64)
    smgID = bodySlice.loadUintBig(256)
    tokenPairID = bodySlice.loadUint(32)
    crossValue = bodySlice.loadUintBig(256)
    let dstUserAccountBufferLen = bodySlice.loadUint(8)
    let dstUserAccountBuffer = bodySlice.loadBuffer(dstUserAccountBufferLen)

    let extraSlice = bodySlice.loadRef().beginParse()
    addrTokenAccount =   extraSlice.loadAddress()
    jwAddrSrc = extraSlice.loadAddress()
    jwAddrBridgeSc = extraSlice.loadAddress()
    extraSlice.endParse()
    dstUserAccount = "0x"+dstUserAccountBuffer.toString('hex')
    return{
        opCode,
        queryId,
        smgID,
        tokenPairID,
        crossValue,
        dstUserAccount,
        addrTokenAccount,
        jwAddrSrc,
        jwAddrBridgeSc
    }
}

async function getTransResult(client:WanTonClient, scAddr:Address,tran:Transaction){
    return await getTranResultByTran(client,scAddr,tran);
}