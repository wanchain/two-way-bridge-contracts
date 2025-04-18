import {DBDataDir} from './common'
import path from 'path';
import {bigIntReplacer, ensureFileAndPath, ensurePath, removeFile, sleep} from "../utils/utils";
import {getClient, TonClientConfig} from "../client/client";
import {TonClient} from "@ton/ton";
import {Address, beginCell, storeMessage, Transaction} from "@ton/core";
import formatUtil from "util";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";
import {MAX_LIMIT,MAX_RETRY} from "../const/const-value";

//todo how to provide testnet | mainnet information.
const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

var _ = require('lodash');

const { Mutex } = require('async-mutex');

const minLt = BigInt(0)
const maxLt = 1n << 256n - 1n;

export enum RangeOpen {
    CloseRange,    // 0
    RightOpenRange,  // 1
    //LeftOpenRange,  // 2
    //BothOpenRange  // 3
}

export type TonTransaction = {
    hash: string,// hexString
    lt:bigint,
    raw:string,
    in:{
        src: string,
        inMsgHash:string,
        inBodyHash:string,
        createdLt:bigint,
        createAt:bigint,
    },
    out:{
        dst:string,
        outMsgHash:string,
        outBodyHash:string,
        createdLt:bigint,
        createAt:bigint,
    }[],
    emitEventOrNot:boolean,
}

type Data = {
    trans: TonTransaction[],
    isInitial: boolean,
    scanTasks:Task[]
}

type Task = {
    rangeStart:bigint,
    rangeEnd:bigint,
    rangeOpen:RangeOpen,
}

const defaultData:Data = {
    trans:[],
    isInitial:true,
    scanTasks:[{
        rangeStart:minLt,
        rangeEnd:maxLt,
        rangeOpen:RangeOpen.RightOpenRange,
    }],
}

var serializeWithBig = function(obj:any){
    return JSON.stringify(obj,bigIntReplacer,2)
}

var deserializeWithBig = function(str:string){
    return JSON.parse(str,bigIntReplacer);
}

exports.DB = class DB {
    private readonly dbName: string;
    private  fullFileName: string;
    private db = null;
    private mutex: any;
    constructor(dbName:string) {
        this.dbName = dbName;
        this.db = null;
        this.mutex = new Mutex();
    }

    getDbName() {
        return this.dbName;
    }

    async init(dbName:string) {

        const low = require('lowdb')
        const FileSync = require('lowdb/adapters/FileSync')
        const fullName = path.join(...[DBDataDir,dbName+'.json'])
        console.log("fullName",fullName);
        this.fullFileName = fullName;
        if(!(await ensurePath(fullName))){
            throw new Error(`init db error ${fullName}`);
        }

        const adapter = new FileSync(fullName,{
            defaultValue:defaultData,
            serialize:serializeWithBig,
            deserialize:deserializeWithBig,
        });
        this.db = low(adapter)
    }

    async stopFeedTrans(){
        const release = await this.mutex.acquire();
        try {
            console.log("Entering stopFeedTrans");
        } finally {
            release();
        }
    }

    async insertTrans(trans:TonTransaction[]){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("Entering insertTrans");
            copy = _.cloneDeep(this.db.getState())
            _.forEach(trans, tran => {
                this.db.get('trans').value().push(tran);
            });
            this.db.write();
        }catch(err){
            this.db.setState(copy);
            console.log("insertTrans","err",err);
        }finally {
            release();
        }
    }

    /////////////////////////////////////
    // write db
    /////////////////////////////////////
    async updateTask(tasks:Task[]){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("Entering updateTask");
            copy = _.cloneDeep(this.db.getState())
            this.db.set("scanTasks",tasks).write();
        }catch(err){
            this.db.setState(copy)
            console.log("updateTask","err",err);
        }
        finally {
            release();
        }
    }

    async setTranHandleFlag(tran:TonTransaction,finishOrNot:boolean){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("Entering setTranHandleFlag");
            copy = _.cloneDeep(this.db.getState())

            this.db.get('trans').find({hash: tran.hash,lt:tran.lt})
                .assign({emitEventOrNot: finishOrNot})
                .write()
        } catch (err) {
            this.db.setState(copy)
            console.log("setTranHandleFlag","err",err);
        }
        finally {
            release();
        }
    }

    async setTranHandleFlags(trans:TonTransaction[],finishOrNots:boolean[]){
        console.log("Entering setTranHandleFlag");
        if(trans.length != finishOrNots.length || trans.length == 0 ){
            throw(new Error("setTranHandleFlag fail"))
        }
        try {
            for(let i = 0;i < trans.length; i++){
                await this.setTranHandleFlag(trans[i],finishOrNots[i]);
            }
        }catch(err){
            console.log("setTranHandleFlag","err",err);
        }
    }
    // isInitial (true->false)
    async setScanStarted(){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("Entering setScanStarted");
            copy = _.cloneDeep(this.db.getState())
            this.db.set('isInitial', false).write();
        }catch(err){
            this.db.setState(copy);
            console.log("setScanStarted","err",err);
        }
        finally {
            release();
        }
    }

    async getScanStatus(){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("Entering getScanStatus");
            copy = _.cloneDeep(this.db.getState())
            return this.db.get('isInitial').value();
        }catch(err){
            this.db.setState(copy);
            console.log("setScanStarted","err",err);
        }
        finally {
            release();
        }
    }

    // scan history and increased new trans into db.
    async feedTrans(){
        let scanInit = await this.getScanStatus();
        if(scanInit){
            await this.setScanStarted();
        }
        while(true){
            try{
                let tasks = await this.getTasks();
                let retTasks = await this.scanTonTxByTasks(tasks);
                await this.updateTask(retTasks);
            }catch(err){

            }
            console.log(`***************************feedTrans is working ${this.dbName}**************************************`);
            await sleep(1000);
        }
    }

    async scanTonTxByTasks(tasks:Task[]){
        let retTask:Task[] = [];
        for(let i = tasks.length-1 ; i>= 0; i--){
            try{
                retTask.push(...(await this.scanTonTxByTask(tasks[i])));
            }catch(err){
                console.log("scanTonTxByTasks err",err);
                retTask.push(tasks[i]);
            }
        }
        return retTask;
    }
    async scanTonTxByTask(task:Task){
        let rangeStartLt = task.rangeStart;
        let rangeEndLt = task.rangeEnd;
        let rangeOpen = task.rangeOpen;
        let retTask:Task[] = [];
        let client:TonClient = await getClient(config);   //todo check how to provide config.
        let maxScanedLt = BigInt(rangeStartLt);
        let minScanedLt = BigInt(rangeEndLt);

        let trans = [];
        let transCount = MAX_LIMIT;
        let limit = MAX_LIMIT;
        let maxRetry = MAX_RETRY;
        let retry = MAX_RETRY;
        let needSlitRange = false;
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
            to_lt:rangeStartLt.toString(10),
            lt:rangeEndLt.toString(10),
        }
        let scAddress = Address.parse(this.dbName)

        try{
            while(transCount){
                let getSuccess = false
                while(maxRetry-- >0 && (!getSuccess)){
                    try{
                        console.log("maxRetry = %s, getSuccess = %s, transCount = %s, scAddress = %s opts = %s",maxRetry,getSuccess,transCount,scAddress,opts);
                        let ret = await client.getTransactions(scAddress,opts)
                        transCount = ret.length;
                        console.log("getTransactions success","opts",opts,"len of getTransactions",transCount);
                        for(let tran of ret){
                            console.log("=====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10));
                            trans.push(tran);
                        }
                        if(ret.length){
                            opts.lt = ret[ret.length-1].lt.toString(10);
                            opts.hash = ret[ret.length-1].hash().toString('base64');
                            maxScanedLt = ret[0].lt > maxScanedLt ? ret[0].lt : maxScanedLt
                            minScanedLt = ret[ret.length-1].lt < minScanedLt ? ret[ret.length-1].lt : minScanedLt;
                        }
                        console.log("maxScanedLt",maxScanedLt,"minScanedLt",minScanedLt,"scAddress or dbName",this.dbName);

                        let tonTrans:TonTransaction[] = [];
                        tonTrans = this.convertTranToTonTrans(trans);
                        await this.insertTrans(tonTrans);
                        trans = [];

                        getSuccess = true;
                        maxRetry = retry;
                    }catch(e){
                        console.log("err ",e);
                        await sleep(2000);
                    }
                }
                if(maxRetry == 0){
                    let err = new Error(formatUtil.format("getTransactions failed after %d retry. opts is %s",retry,JSON.stringify(opts)))
                    throw("fail by max_retry"+err.message);
                }

                await sleep(2000);
            }
        }catch(err){
            console.log("err",err.message);
            if(err.message.toString().includes("fail by max_retry")){
                //todo need handle sepcial?
            }
            needSlitRange = true;
        }
        if(transCount ==0){
            console.log("scan success","startLt",rangeStartLt.toString(10),"endLt",rangeEndLt.toString(10),"rangeOpen",rangeOpen);

        }
        if(maxScanedLt < rangeEndLt){
            retTask.push({
                rangeStart:maxScanedLt,
                rangeEnd:rangeEndLt,
                rangeOpen:RangeOpen.RightOpenRange,
            });
        }
        if(needSlitRange){
            if(rangeStartLt < minScanedLt){
                retTask.push({
                    rangeStart:rangeStartLt,
                    rangeEnd:minScanedLt,
                    rangeOpen:RangeOpen.CloseRange,
                });
            }
        }
        return retTask;
    }

    convertTranToTonTrans(trans:Transaction[]){
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
                    src: cii.src.toString(),
                    inMsgHash:inMessageHash,
                    inBodyHash:inMessageBodyCellHash,
                    createdLt:cii.createdLt,
                    createAt:BigInt(cii.createdAt),
                },
                out:outMsgs,
                emitEventOrNot:false,
            }
            tonTrans.push(tonTranTemp);
        }
        return tonTrans;
    }

    convertTonTransToTran(tonTrans:TonTransaction[]){
        let trans:Transaction[] = [];
        for(let tonTran of tonTrans){
            let tranTemp:Transaction; //todo should check core/transaction.
            trans.push(tranTemp);
        }
        return trans;
    }

    async clearDb(){
        this.db.setState({}).write();
        await removeFile(this.fullFileName);
    }

    /////////////////////////////////////
    // read db
    /////////////////////////////////////

    async getTasks(){
        const release = await this.mutex.acquire();
        try {
            console.log("getTasks");
            return _.cloneDeep(this.db.get("scanTasks").value());
        }catch(err){
            console.log("getTasks","err",err);
        }
        finally {
            release();
        }
    }

    async getParenTx(tran:TonTransaction){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getParenTx");
            copy = _.cloneDeep(this.db.get('trans').value());
        }catch(err){
            console.log("getParenTx","err",err);
        }
        finally {
            release();
        }

        let result :TonTransaction[] = [];
        try{
            result = _.filter(copy, (tonTran) =>{
                return _.some(tonTran.out, (item) => {
                    return (
                        (item.dst === tran.in.src && item.createdLt === tran.in.createdLt) &&
                        ((item.outMsgHash === tran.in.inMsgHash) || (item.outBodyHash == tran.in.inBodyHash))
                    );
                });
            });

        }catch(err){
            console.log("getParenTx","map err",err);
        }finally {
            copy = null;
        }
        return result.length? result[0]:null;
    }

    async getChildTxs(tran:TonTransaction){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getChildTxs");
            copy = _.cloneDeep(this.db.get('trans').value());
        }catch(err){
            console.log("getChildTxs","err",err);
        }
        finally {
            release();
        }

        let result:TonTransaction[] = [];
       try{
            for(let i =0; i<tran.out.length;i++){
                let oneTran = _.filter(copy,(item)=>{
                    return (item.in.src ==  tran.out[i].dst  &&
                        (item.in.inMsgHash == tran.out[i].outMsgHash || item.in.inBodyHash == tran.out[i].outBodyHash) &&
                    item.in.createdLt == tran.out[i].createdLt);
                })

                result.push(...oneTran);
            }
       }catch(err){

       }finally {
           copy = null;
       }
       return result;
    }

    async getTxByTxHash(txHash: string) {
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getChildTxs");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.log("getChildTxs", "err", err);
        } finally {
            release();
        }

        let result: TonTransaction = null;
        try {

            result = _.filter(copy, (item) => {
                return (item.hash == txHash);
            })
        } catch (err) {

        } finally {
            copy = null;
        }
        return result;
    }

    async getTxByMsg(msgHash:string,bodyHash:string,lt:bigint){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getChildTxs");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.log("getChildTxs", "err", err);
        } finally {
            release();
        }

        let result: TonTransaction = null;
        try {
            result = _.filter(copy, (item) => {
                return (
                    (item.in.inMsgHash == msgHash || item.in.inBodyHash == bodyHash) &&
                    item.in.createdLt == lt);
            })
        } catch (err) {
            console.log("getTxByMsg","err",err);
        } finally {
            copy = null;
        }
        return result;
    }
}