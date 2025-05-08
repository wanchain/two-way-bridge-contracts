import {Address, Cell, loadTransaction, openContract, Transaction} from "@ton/core";
import {TonClient} from "@ton/ton";
import {codeTable} from "../code/encode-decode";


import {logger} from '../utils/logger'
import {getTranResultByTran, getTranResultByTxHash, TranResult} from "../transResult/transResult";
import {ZERO_ACCOUNT_STR} from "../const/const-value";
const formatUtil = require('util');
import * as opcodes from "../opcodes";
import {OP_TRANSFER_NOTIFICATION} from "../opcodes";
import {getJettonAddress} from "../wallet/jetton";
import {getTokenPairInfo} from "../code/userLock";
import {
    bigIntReplacer,
    bigIntToBytes32,
    formatError,
    isAddressEqual,
    isValidHexString,
    sleep,
    toBase64
} from "../utils/utils";

import {MAX_LIMIT,MAX_RETRY} from "../const/const-value";
import {DBAccess} from "../db/DbAccess";
import {WanTonClient} from "../client/client-interface";
/*
example of ret:

[{
  eventName: 'AddTokenPair',
  id: 3,
  fromChainID: 4660,
  fromAccount: 833589FCD6EDB6E08F4C7C32D4F71B54BDA02913,
  toChainID: 17767,
  toAccount: 0000000000000000000000000000000000000000000000000000000000000000,
  txHashBase64: 'rqSZE1h0tWjn2EqI5awDLIDB4sLhUEwSdW+5fRUMmQE=',
  txHash: 'aea499135874b568e7d84a88e5ac032c80c1e2c2e1504c12756fb97d150c9901',
  lt: 29170426000001n
}]

 */

//todo  block number (seq)
//todo  from (first layer user, origin user.), and first layer hash.
//todo  gas used (accumuted, summary.)
//todo  in send Message, message body-> txhash.


export async function getEvents(client: WanTonClient,scAddress:string,limit:number,lt?:string,to_lt?:string,eventName?:string):Promise<any> {

    console.log("scAddress:%s,limit:%s,lt:%s,to_lt:%s,eventName:%s",scAddress,limit,lt,to_lt,eventName);
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

    while(true){
        try {
            trans = await getAllTransactions(client, scAddress, limit, MAX_RETRY);
            break;
        }catch(e){
            console.error(formatError(e));
            await sleep(5000);
        }
    }

    for(let tran of trans){
        logger.info(formatUtil.format("tran=>",tran.hash().toString('base64')));
        let event = await getEventFromTran(client,tran,scAddress);
        if(event != null){
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!==found event==!!!!!!!!!!!!!!!!!!!!!!!!!!!",event);
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
    console.log("getTransactions opts = %s",opts);
    let scAddr = Address.parse(scAddress);
    logger.info(formatUtil.format("contractAddr=>",scAddress));
    let ret;
    try{
        //todo check change back
        ret = await client.getTransactions(scAddr,opts)
        //ret = await client.getTransactions(scAddr,{limit:3})
    }catch(err){
        logger.error(formatError(err));
    }
    return ret;
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
               console.log("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddress,JSON.stringify(opts,bigIntReplacer));
               let ret = await client.getTransactions(Address.parse(scAddress),opts)
               transCount = ret.length;
               console.log("getTransactions success","opts",JSON.stringify(opts,bigIntReplacer),"len of getTransactions",transCount);
               for(let tran of ret){
                   console.log("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
                   trans.push(tran);
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
    console.log("getAllTransactions success");
    return trans;
}

export async function getEventFromTran(client:WanTonClient,tran:Transaction, scAddress:string){
    let bodyCell = tran.inMessage?.body;
    if(!bodyCell){
        console.error("body is empty","tran",tran.hash().toString("base64"));
        return null;
    }
    try{
        let opCode = await getOpCodeFromCell(bodyCell);
        logger.info(formatUtil.format("opCode=>",opCode.toString(16)));
        logger.info(formatUtil.format("codeTable[opCode]=>",codeTable[opCode]));
        if(!codeTable[opCode]){
            console.error("opCode is empty","tran","opCode",opCode.toString(16));
            return null;
        }
        console.log("before decode bodyCell");
        let decoded = await codeTable[opCode]["deCode"](bodyCell);
        console.log("after decode bodyCell");
        decoded.txHashBase64 = tran.hash().toString("base64");
        decoded.txHash = tran.hash().toString("hex");

        decoded.lt = tran.lt;
        decoded.prevTransactionHash = tran.prevTransactionHash
        decoded.prevTransactionLt = tran.prevTransactionLt

        // handle userLock
        if(opCode == opcodes.OP_CROSS_UserLock){
            logger.info(formatUtil.format("getEventFromTran OP_CROSS_UserLock"));

            let handleResult = await handleUserLockEvent(client,Address.parse(scAddress),tran)
            if (!handleResult.valid){
                logger.error(formatUtil.format("handleResult OP_CROSS_UserLock is not valid"));
                return null;
            }
            decoded.origin = handleResult.origin;
        }else{
            let handleResult = await handleCommonEvent(client,Address.parse(scAddress),
                tran)
            if (!handleResult.valid){
                logger.error(formatUtil.format("handleResult handleCommonEvent is not valid"));
                return null;
            }
            decoded.origin = handleResult.origin;
        }

        return await codeTable[opCode]["emitEvent"](decoded);
    }catch(err){
        logger.error(formatUtil.format("getEventFromTran err",formatError(err)));
        return null;
    }
}

export async function getTransaction(client:WanTonClient,scAddress:string,lt:string,tranHash:string){
    // todo should add below code
    console.log("Entering getTransaction","scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
    let retTranFromDb = await getTransactionFromDb(client,scAddress,lt,toBase64(tranHash));
    console.log("getTransaction","getTransactionFromDb","retTranFromDb",retTranFromDb);
    if(retTranFromDb){
        return retTranFromDb;
    }

    let tran:Transaction;
    let trans:Transaction[] = [];
    let retry = 2
    let status = false;
    let foundTran = false;

    let maxTrans = 1000;
    let transChecked = 0;

    while(retry-- > 0){
        try{
            console.log("before client.getTransaction","scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
            tran = await client.getTransaction(Address.parse(scAddress),lt,toBase64(tranHash)); //  cannot compute block with specified transaction: cannot find block (0,e56031f43e6493da) lt=33028010000003: lt not in db'
            console.log("client.getTransaction success", "scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash),"tran = > ",tran);
            return tran;
        }catch(err){
            console.error("getTransaction","client.getTransaction error",formatError(err),"scAddress",scAddress,"lt",lt,"hash",tranHash,"hash(base64)",toBase64(tranHash));
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

                console.log("getTransactions","scAddress",scAddress,"opts",opts);
                trans = await client.getTransactions(Address.parse(scAddress),opts);
                status = true;
                retry = MAX_RETRY;
            }catch(err){
                //console.error(err.message,err.response?.data?.error,err);
                console.error(formatError(err))
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
            console.log("getTransactions from rpc","i",i,"txHash",tx.hash().toString("base64"));
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
    console.log("Entering getTransactionFromDb","scAddress",scAddress,"lt",lt,"tranHash",tranHash);
    let dbAccess = await DBAccess.getDBAccess();
    if(!dbAccess){
        console.error("not using db cache");
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
            console.error("getTxByHashLt err",formatError(err),"retry",retry,"dbName","scAddress",scAddress,"hash",tranHash)
        }
        await sleep(10000);
    }
    console.log("getTransactionFromDb success","scAddress",scAddress,"lt",lt,"tranHash",tranHash,"retTx",retTx);
    return retTx
}

export async function getEventByTranHash(client:WanTonClient, scAddress:string, lt:string, tranHash:string){
    let tran = await getTransaction(client,scAddress,lt,tranHash);
    console.log("getEventByTranHash getTransaction success",tran, "tranHash ",tran.hash().toString('hex'));
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

    logger.info(formatUtil.format("Entering handleUserLockEvent"));

    let transResult  = await getTransResult(client,scAddr,tran);
    if (!transResult.success){
        logger.error("the trans tree is not success")
        return {
            valid:false,
            origin:transResult.originAddr.toString()
        }
    }

    let bodyCellLock = tran.inMessage.body
    let decodedResult = await decodeUserLock(bodyCellLock);
    console.log("decodeResult of decodeUserLock", decodedResult);

    //handle bridge->bridge(userLock)
    // get parent trans
    let preTx = await getTransaction(client,scAddr.toString(),tran.prevTransactionLt.toString(10),bigIntToBytes32(tran.prevTransactionHash).toString('base64'));
    let bodyCell = preTx.inMessage.body
    let bodySlice = bodyCell.beginParse();
    let op = bodySlice.loadUint(32);
    if(op == opcodes.OP_TRANSFER_NOTIFICATION){
        let fromAddrHead = preTx.inMessage.info.src
        let ret = await getTokenPairInfo(client,scAddr,decodedResult.tokenPairID)
        // 1. check tokenAccount content with the one get by tokenPairId
        if(!isAddressEqual(decodedResult.addrTokenAccount,ret.tokenAccount)){
            throw Error("invalid tokenpairid or tokenAccount");
        }
        // 2. check from address is content with the one computed by getJettonAddress
        // build jettonAddress
        let jwAddr = await getJettonAddress(client,Address.parse(ret.tokenAccount),scAddr)
        console.log("======jwAddr",jwAddr.toString(),"preTx.inMessage.info.src",(preTx.inMessage.info.src as unknown as Address ).toString());
        if(!isAddressEqual(jwAddr,(preTx.inMessage.info.src as unknown as Address ))){
            throw Error("invalid from address of transfer notification");
        }
    }
    return {
        valid:true,
        origin:transResult.originAddr.toString()
    }
}

async function handleCommonEvent(client:WanTonClient, scAddr:Address,tran:Transaction){

    logger.info(formatUtil.format("Entering handleCommonEvent"));

    let transResult  = await getTransResult(client,scAddr,tran);
    if (!transResult.success){
        logger.error("the trans tree is not success")
        return {
            valid:false,
            origin:transResult.originAddr.toString()
        }
    }
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