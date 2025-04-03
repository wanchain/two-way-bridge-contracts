import {Address, Cell, loadTransaction, openContract, Transaction} from "@ton/core";
import {TonClient} from "@ton/ton";
import {codeTable} from "../code/encode-decode";


import {logger} from '../utils/logger'
import {getTranResultByTxHash, TranResult} from "../transResult/transResult";
import {ZERO_ACCOUNT_STR} from "../const/const-value";
const formatUtil = require('util');
import * as opcodes from "../opcodes";
import {OP_TRANSFER_NOTIFICATION} from "../opcodes";
import {getJettonAddress} from "../wallet/jetton";
import {getTokenPairInfo} from "../code/userLock";
import {isAddressEqual, sleep} from "../utils/utils";

const MAX_LIMIT = 1000;
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

export async function getEvents(client: TonClient,scAddress:string,limit:number,lt?:string,to_lt?:string,eventName?:string):Promise<any> {
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
    if(to_lt?.length && lt?.length){
        if (BigInt(lt)<=BigInt(to_lt)){
            throw new Error("lt must be more than to_lt");
        }
    }

    let events = [];
    let trans = await getTransactions(client,scAddress,{limit,lt,to_lt});
    if(trans?.length>limit){
        throw new Error("transaction length is more than limit, decrease the during [lt_start,lt_end]");
    }

    logger.info(formatUtil.format("trans.length=>",trans?.length));

    for(let tran of trans){
        logger.info(formatUtil.format("tran=>",tran.hash().toString('base64')));
        /*
        let event = await getEventFromTran(client,tran,scAddress);
        if(event != null){
            if(eventName && event.eventName.toLowerCase() != eventName.toLowerCase()){
                continue;
            }
            events.push(event);
        }
         */
    }
    return events;
}

export async function getTransactions(client:TonClient,scAddress:string,opts:{
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
        console.log("err",err);
        logger.error(formatUtil.format("getTransactions error",err.code));
    }
    return ret;
}

export async function getAllTransactions(client:TonClient,scAddress:string,limit:number, retry:number){
    let lt = "";
    let to_lt = "";
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
               console.log("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddress,opts);
               let ret = await client.getTransactions(Address.parse(scAddress),opts)
               transCount = ret.length;
               for(let tran of ret){
                   console.log("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
               }
               if(ret.length){
                   opts.lt = ret[ret.length-1].lt.toString(10);
                   opts.hash = ret[ret.length-1].hash().toString('base64');
               }
               getSuccess = true;
               maxRetry = retry;
           }catch(e){
               console.log("err ",e);
               await sleep(2000);
           }
        }

        await sleep(2000);
    }
}

async function getEventFromTran(client:TonClient,tran:Transaction, scAddress:string){
    let bodyCell = tran.inMessage?.body;
    if(!bodyCell){
        return null;
    }
    try{
        let opCode = await getOpCodeFromCell(bodyCell);
        logger.info(formatUtil.format("opCode=>",opCode));
        logger.info(formatUtil.format("codeTable[opCode]=>",codeTable[opCode]));
        if(!codeTable[opCode]){
            return null;
        }
        let decoded = await codeTable[opCode]["deCode"](bodyCell);
        decoded.txHashBase64 = tran.hash().toString("base64");
        decoded.txHash = tran.hash().toString("hex");

        decoded.lt = tran.lt;
        decoded.prevTransactionHash = tran.prevTransactionHash
        decoded.prevTransactionLt = tran.prevTransactionLt

        // handle userLock
        if(opCode == opcodes.OP_CROSS_UserLock){
            logger.info(formatUtil.format("getEventFromTran OP_CROSS_UserLock"));

            let handleResult = await handleUserLockEvent(client,Address.parse(scAddress),
                tran.hash().toString(),tran.lt.toString(10),
                tran.prevTransactionHash.toString(10),
                tran.prevTransactionLt.toString(10),)
            if (!handleResult.valid){
                logger.error(formatUtil.format("handleResult OP_CROSS_UserLock is not valid"));
                return null;
            }
            decoded.origin = handleResult.origin;
        }
        return await codeTable[opCode]["emitEvent"](decoded);
    }catch(err){
        logger.error(formatUtil.format("getEventFromTran err",err.message));
        return null;
    }
}

async function getOpCodeFromCell(cell:Cell){
    if(cell.equals(Cell.EMPTY)){
        throw new Error("empty cell");
    }
    let slice = cell.beginParse();
    try{
        return slice.preloadUint(32);
    }catch(err){
        logger.error(formatUtil.format("getOpCodeFromCell(err)=>",err));
        throw new Error("no opCode find");
    }
}
/*
{
    valid: true|false,  // used the trans tree is valid
    origin: Address,    // from address, who trigger the lock event.
}
 */

async function handleUserLockEvent(client:TonClient, scAddr:Address,txHash:string, lt:string,preHash:string, preLt:string){

    logger.info(formatUtil.format("handleUserLockEvent"));

    let transResult  = await getTransResult(client,scAddr,txHash,lt);
    if (!transResult.success){
        logger.error("the trans tree is not success")
        return {
            valid:false,
            origin:transResult.originAddr.toString()
        }
    }

    let tx = await client.getTransaction(scAddr,lt,txHash)
    let bodyCellLock = tx.inMessage.body
    let decodedResult = await decodeUserLock(bodyCellLock);

    // get parent trans
    let preTx = await client.getTransaction(scAddr,preLt,preHash)
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
        if(isAddressEqual(jwAddr,(preTx.inMessage.info.src as unknown as Address ))){
            throw Error("invalid from address of transfer notification");
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
    smgID = bodySlice.loadUint(256)
    tokenPairID = bodySlice.loadUint(32)
    crossValue = bodySlice.loadUint(256)
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

async function getTransResult(client:TonClient, scAddr:Address,txHash:string, lt:string){
    return await getTranResultByTxHash(client,scAddr,txHash,lt);
}