import {Address, Cell, loadTransaction, openContract, Transaction} from "@ton/core";
import {TonClient} from "@ton/ton";
import {codeTable} from "../code/encode-decode";


import {logger} from '../utils/logger'
const formatUtil = require('util');

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
        let event = await getEventFromTran(tran);
        if(event != null){
            if(eventName && event.eventName.toLowerCase() != eventName.toLowerCase()){
                continue;
            }
            events.push(event);
        }
    }
    return events;
}

async function getTransactions(client:TonClient,scAddress:string,opts:{
    limit: number;
    lt?: string;
    hash?: string;
    to_lt?: string;
    inclusive?: boolean;
    archival?: boolean;
}):Promise<any> {
    let scAddr = Address.parse(scAddress);
    logger.info(formatUtil.format("contractAddr=>",scAddress));
    let ret;
    try{
        //todo check change back
        //ret = await client.getTransactions(scAddr,opts)
        ret = await client.getTransactions(scAddr,{limit:3})
    }catch(err){
        logger.error(formatUtil.format("getTransactions error",err.code));
    }
    return ret;
}

async function getEventFromTran(tran:Transaction){
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