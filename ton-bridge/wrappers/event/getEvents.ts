import {Address, Cell, loadTransaction, openContract, Transaction} from "@ton/core";
import {TonClient} from "@ton/ton";
import {codeTable} from "../code/encode-decode";
const MAX_LIMIT = 1000;
export async function getEvents(client: TonClient,scAddress:string,limit:number,lt_start:bigint,lt_end:bigint):Promise<any> {
    if (!client){
        throw new Error("client does not exist");
    }
    if (!Address.isAddress(Address.parse(scAddress))){
        throw new Error("scAddress is invalid");
    }
    if(limit>MAX_LIMIT){
        throw new Error("limit is more than MAX_LIMIT(1000)");
    }
    if (lt_end<=lt_start){
        throw new Error("lc_end must be more than lc_start");
    }

    let events = [];
    let trans = await getTransactions(client,scAddress,limit,lt_start,lt_end);
    if(trans.length>limit){
        throw new Error("transaction length is more than limit, decrease the during [lt_start,lt_end]");
    }

    console.log("trans.length=>",trans.length);

    for(let tran of trans){
        console.log("tran=>",tran.hash().toString('base64'));
        let event = await getEventFromTran(tran);
        if(event != null){
            events.push(event);
        }
    }
    return events;
}

async function getTransactions(client:TonClient,scAddress:string,limit:number,lt_start:bigint,lt_end:bigint):Promise<any> {
    let scAddr = Address.parse(scAddress);
    console.log("contractAddr=>",scAddress);
    //todo how to build lt parameter? how to get the first lt of the contract?
    return await client.getTransactions(scAddr,{limit})
}

async function getEventFromTran(tran:Transaction){
    let bodyCell = tran.inMessage?.body;
    if(!bodyCell){
        return null;
    }
    try{
        let opCode = await getOpCodeFromCell(bodyCell);
        console.log("opCode=>",opCode);
        console.log("codeTable[opCode]=>",codeTable[opCode]);
        //todo delete following
        if(!codeTable[opCode]){
            return null;
        }
        let decoded = await codeTable[opCode]["deCode"](bodyCell);
        decoded.txHashBase64 = tran.hash().toString("base64");
        decoded.txHash = tran.hash().toString("hex");
        return await codeTable[opCode]["emitEvent"](decoded);
    }catch(err){
        console.log("err=>",err.message);
        return null;
    }
}

async function getOpCodeFromCell(cell:Cell){
    if(cell.equals(Cell.EMPTY)){
        throw new Error("empty cell");
    }
    let slice = cell.beginParse();
    try{
        //return "0x"+slice.preloadUint(32).toString(16);
        return slice.preloadUint(32);
    }catch(err){
        console.log("getOpCodeFromCell(err)=>",err);
        throw new Error("no opCode find");
    }
}