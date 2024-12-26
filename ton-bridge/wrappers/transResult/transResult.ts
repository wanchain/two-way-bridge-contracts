import {Address, beginCell, storeMessage, storeMessageRelaxed, Transaction} from "@ton/core";
import {TonClient} from "@ton/ton";
import {TransactionDescriptionGeneric} from "@ton/core/src/types/TransactionDescription";
import {TransactionComputeVm} from "@ton/core/src/types/TransactionComputePhase";
import {bigIntReplacer} from "../utils/utils";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

export async function getTranResultByMsgHash(client:TonClient,scAddr:Address,msgBodyCellHash:string,msgInHash:string):Promise<TranResult>{

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

export async function getTranResultByTxHash(client:TonClient,scAddr:Address,txHash:string, lt:string):Promise<TranResult>{
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

async function getTranPathInfoByMsgHash(client: TonClient, scAddr: Address, msgBodyCellHash:string, msgInHash: string): Promise<TranPathInfo> {
    let pivotTran = await getTranByMsgHash(client, scAddr, msgBodyCellHash,msgInHash);
    let path = await getTranPathInfoByPivotTran(client, scAddr, pivotTran);
    return path;
}

async function isTranSuccess(tran:Transaction):Promise<boolean>{
    let td = tran.description as unknown as TransactionDescriptionGeneric
    if(td.aborted){
        return false
    }

    let cp = td.computePhase as unknown as TransactionComputeVm
    if(!cp.success || cp.exitCode != 0){
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

async function getUpperSteps(client:TonClient,scAddr:Address,tran:Transaction, path:TranPathInfo){
    if(tran.inMessage.info.type == 'external-in'){
        return
    }


    const inMessageCell = beginCell().store(storeMessage( tran.inMessage)).endCell();
    let tranInMsgHash = inMessageCell.hash().toString('hex');

    let tranInMsgBodyCellHash = tran.inMessage.body.hash().toString('hex');

    let upperAddress = tran.inMessage.info.src as Address;
    let to_lt:string = "0";
    let maxTrans = 1000;
    let transChecked = 0;
    while(transChecked<maxTrans){
        const transactions = await client.getTransactions(upperAddress, {
            to_lt ,
            limit: 10,
        });
        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
            if(i == transactions.length-1) {
                to_lt = tx.lt.toString()
            }
            const transactionHash = tx.hash().toString('hex');
            console.log("tx hash is:",i, tx.lt, transactionHash)
            const outMessages = tx.outMessages;
            let foundInOutMsgs = false;
            for(let outMsgKey of outMessages.keys()){
                let outMsg = outMessages.get(outMsgKey);
                let outMsgHash = beginCell().store(storeMessage(outMsg)).endCell().hash().toString('hex');
                let outMsgBodyHash = outMsg.body.hash().toString('hex');
                if (outMsg.info.dest == scAddr && (outMsgHash == tranInMsgHash || outMsgBodyHash == tranInMsgBodyCellHash)){
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

            if (foundInOutMsgs){
                console.log("found upper tx",tx.hash().toString('base64'));
                await getUpperSteps(client,upperAddress,tx,path);
                break; // find the upper tx
            }
        }

        transChecked += transactions.length;
    }

    if(transChecked>=maxTrans){
        throw new Error("can not found the upper tx!")
    }
}

async function getLowerSteps(client:TonClient,scAddr:Address,tran:Transaction, path:TranPathInfo){
    if(tran.outMessages.keys().length == 0){
        return
    }

    const outMessages = tran.outMessages;
    for(let outMsgKey of outMessages.keys()){
        let outMsg = outMessages.get(outMsgKey);
        let lowerAddr = outMsg.info.dest as Address;
        let lowerAddrMsgInHash = outMsg.body.hash().toString('hex');
        let lowerTx = await getTranByMsgHash(client,lowerAddr,lowerAddrMsgInHash);

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

async function getTranPathInfoByPivotTran(client:TonClient,scAddr:Address,pivotTran:Transaction):Promise<TranPathInfo>{
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

    await getLowerSteps(client,scAddr,pivotTran,afterPivotTranPathInfo);   // find children tx
    await getUpperSteps(client,scAddr,pivotTran,beforePivotTranPathInfo);  // find parent tx

    console.log("[pivoltTranStepInfo]====>",[pivoltTranStepInfo]);
    console.log("[beforePivotTranPathInfo]====>",beforePivotTranPathInfo);
    console.log("[afterPivotTranPathInfo]====>",afterPivotTranPathInfo);
    return allTranPathInfo.concat(beforePivotTranPathInfo,[pivoltTranStepInfo],afterPivotTranPathInfo);
}

export async function getTranByMsgHash(client:TonClient, scAddr:Address, msgBodyCellHash:string, msgHash:string=''):Promise<Transaction> {
    let maxRetry = 5;

    let txOpts: {
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    }={
        limit: 10
    }

    while(maxRetry-- > 0){
        console.log("call getTranByMsgHash, para:", scAddr, txOpts);
        let transactions:Transaction[] = [];
        try{
            transactions = await client.getTransactions(scAddr, txOpts);
        }catch (e) {
            console.log(e);
            await sleep(3000);
            continue;
        }
        console.log("transactions length:", transactions.length)
        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
            // console.log("tx:", tx)
            const transactionHash = tx.hash().toString('hex');
            console.log("tx hash is:",i, tx.lt, transactionHash)
            const inMessage = tx.inMessage;
            console.log("---------------tx.inMessage==>",JSON.stringify(tx.inMessage,bigIntReplacer));
            console.log("---------------tx.inMessage==>",tx.inMessage);
            let inMessageHash:string = "";
            let inMessageBodyCellHash:string = "";

            const inMessageCell = beginCell().store(storeMessage(inMessage)).endCell();
            inMessageHash = inMessageCell.hash().toString('hex');
            inMessageBodyCellHash = inMessage.body.hash().toString('hex');

            console.log("inMessageCell.hash",inMessageHash);
            console.log("inMessageBody.hash",inMessage.body.hash().toString('hex'));
            if(inMessageHash == msgHash) {
                console.log("********************************** external-in message found:", tx.lt, tx.hash().toString('hex'))
                return transactions[i];
            }else{
                if(inMessageBodyCellHash == msgBodyCellHash) {
                    console.log("********************************** internal-in message found:", tx.lt, tx.hash().toString('hex'))
                    return transactions[i];
                }
            }
        }

        if(transactions.length > 0){
            //txOpts.hash = transactions[transactions.length - 1].hash().toString('base64')
            txOpts.to_lt =  transactions[transactions.length - 1].lt.toString()
        }
        await sleep(3000);
    }
}


/*

async function monitorTransactionbyHash(client, addr, txhash, txlt) {
    let allTransactions = []
    const myAddress = Address.parse(addr);
    let tx = await client.getTransaction(myAddress,txlt, txhash)
    for (const outMessage of tx.outMessages.values()) {
        const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
        const outMessageHash = outMessageCell.hash().toString('hex');
        await findTransactionbyMsgHash(client,  outMessage.info.dest.toString({testOnly:true}), outMessageHash, allTransactions)
    }
    let success = true
    for(let i=0; i<allTransactions.length; i++) {
        success = success && allTransactions[i].description.aborted==false && allTransactions[i].description.computePhase.exitCode==0
            && allTransactions[i].description.computePhase.seccess && allTransactions[i].description.actionPhase.seccess
    }
    return {success,allTransactions}
}

async function monitorTransactionbyExternalIn(client, from,  msgHash){
    let allTransactions = []
    await waitTransactionbyExternalIn(client, from, msgHash, allTransactions);
    let success = true
    for(let i=0; i<allTransactions.length; i++) {
        success = success && allTransactions[i].description.aborted==false && allTransactions[i].description.computePhase.exitCode==0
            && allTransactions[i].description.computePhase.seccess && allTransactions[i].description.actionPhase.seccess
    }
    return {success,allTransactions}
}

// wait the new sub transactions to be confirmed
async function waitTransactionbyExternalIn(client, from,  msgHash, allTransactions) {
    const myAddress = Address.parse(from); // address that you want to fetch transactions from
    const maxRetry = 30;
    let retry=0;
    let to_lt = "0"
    while(retry++ < maxRetry) {
        console.log("call getTransactions, para:", myAddress.toString({testOnly:true}), to_lt);
        const transactions = await client.getTransactions(myAddress, {
            to_lt ,
            limit: 10,
        });
        console.log("transactions length:", transactions.length)
        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
            if(i == 0) {
                to_lt = tx.lt.toString()
            }
            const transactionHash = tx.hash().toString('hex');
            console.log("tx hash is:",i, tx.lt, transactionHash)
            const inMessage = tx.inMessage;
            let inMessageHash
            // if (inMessage?.info.type === 'external-in') {
            const inMessageCell = beginCell().store(storeMessage(inMessage)).endCell();
            inMessageHash = inMessageCell.hash().toString('hex');
            //   console.log("inMessageHash", inMessageHash, msgHash);
            if(inMessageHash == msgHash) {
                console.log("found:", tx.lt, tx.hash().toString('hex'))
                allTransactions.push(tx)
                if(tx.outMessagesCount!=0){
                    for (const outMessage of tx.outMessages.values()) {
                        console.log("outMessage:", outMessage)
                        const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
                        const outMessageHash = outMessageCell.hash().toString('hex');
                        console.log("outMessageHash:", outMessageHash)
                        await waitTransactionbyExternalIn(client, outMessage.info.dest.toString(), outMessageHash, allTransactions)
                    }
                }
                return
            }
        }
        await sleep(1000)
    }
}

// find old transactions.
async function findTransactionbyMsgHash(client:TonClient, from:Address,  msgHash:string, allTransactions) {
    const myAddress = from;
    let maxRetry = 30;
    let txOpts = {
        limit: 10
    }
    while(maxRetry-- > 0){
        console.log("call findTransactionbyMsgHash, para:", from, txOpts);
        const transactions = await client.getTransactions(from, txOpts);
        console.log("transactions length:", transactions.length)
        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
            // console.log("tx:", tx)
            const transactionHash = tx.hash().toString('hex');
            console.log("tx hash is:",i, tx.lt, transactionHash)
            const inMessage = tx.inMessage;
            let inMessageHash
            // if (inMessage?.info.type === 'external-in') {
            const inMessageCell = beginCell().store(storeMessage(inMessage)).endCell();
            inMessageHash = inMessageCell.hash().toString('hex');
            //   console.log("inMessageHash", inMessageHash, msgHash);
            if(inMessageHash == msgHash) {
                console.log("found:", tx.lt, tx.hash().toString('hex'))
                allTransactions.push(tx)
                if(tx.outMessagesCount!=0){
                    for (const outMessage of tx.outMessages.values()) {
                        console.log("outMessage:", outMessage)
                        const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
                        const outMessageHash = outMessageCell.hash().toString('hex');
                        console.log("outMessageHash:", outMessageHash)
                        await findTransactionbyMsgHash(client, outMessage.info.dest.toString(), outMessageHash, allTransactions)
                    }
                }
                return
            }
        }
        txOpts.hash = transactions[transactions.length - 1].hash().toString('base64')
        txOpts.lt =  transactions[transactions.length - 1].lt.toString()
    }
}

*/
