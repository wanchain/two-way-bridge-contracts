import {convertTranToTonTrans} from './common'
import path from 'path';
import {
    bigIntReplacer,
    ensureFileAndPath,
    ensurePath,
    formatError,
    isAddressEqual,
    removeFile,
    sleep
} from "../utils/utils";
import {getClient, TonClientConfig,getDBDataDir} from "../client/client";
import {TonClient} from "@ton/ton";
import {Address, beginCell, storeMessage, Transaction} from "@ton/core";
import formatUtil from "util";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";
import {MAX_BACKTRACE_SECONDS, MAX_LIMIT, MAX_RETRY} from "../const/const-value";

//todo how to provide testnet | mainnet information.
// const config:TonClientConfig =  {
//     network:"testnet", // testnet|mainnet
//     tonClientTimeout: 60 * 1000 * 1000,
// }

const config:TonClientConfig =  {
    network:"mainnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

var _ = require('lodash');

const { Mutex } = require('async-mutex');

const minLt = BigInt(0)
//const maxLt = 1n << 256n - 1n;  //error: "TypeError: Can't parse integer in parameter lt"
const maxLt = 1n << 255n - 1n;

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
    rangeEndHash?:string,
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

class DB {
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
        const fullName = path.join(...[getDBDataDir(),dbName+'.json'])
        console.log("fullName",fullName);
        this.fullFileName = fullName;
        if(!(await ensurePath(fullName))){
            throw new Error(`init db error ${fullName}`);
        }

        let myDefaultData = _.cloneDeep(defaultData);
        const adapter = new FileSync(fullName,{
            defaultValue:myDefaultData,
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
        console.log("Entering insertTrans","dbName",this.dbName,"tonTrans.length",trans?.length);
        if(trans?.length == 0){
            return;
        }
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            copy = _.cloneDeep(this.db.getState())
            _.forEach(trans, tran => {
                this.db.get('trans').value().push(tran);
            });
            this.db.write();
        }catch(err){
            this.db.setState(copy);
            console.error("insertTrans","err",formatError(err));
            throw err;
        }finally {
            release();
        }
    }

    /////////////////////////////////////
    // write db
    /////////////////////////////////////
    async updateTask(tasks:Task[]){
        console.log("=======================================Entering updateTask=========================","tasks",JSON.stringify(tasks,bigIntReplacer));
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            copy = _.cloneDeep(this.db.getState())
            this.db.set("scanTasks",tasks).write();
        }catch(err){
            this.db.setState(copy)
            console.error("updateTask","err",formatError(err));
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
            console.log("setTranHandleFlag","err",formatError(err));
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
            console.log("setTranHandleFlag","err",formatError(err));
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
            console.log("setScanStarted","err",formatError(err));
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
            console.log("setScanStarted","err",formatError(err));
        }
        finally {
            release();
        }
    }

    async scanFun(){
        let tasks = await this.getTasks();
        console.log("scanFun","dbName",this.dbName,"tasks",JSON.stringify(tasks,bigIntReplacer));
        let retTasks = await this.scanTonTxByTasks(tasks);
        await this.updateTask(retTasks);
    }

    // scan history and increased new trans into db.
    async feedTrans(){
        console.log("Entering feedTrans..............",this.dbName);
        let scanInit = await this.getScanStatus();
        if(scanInit){
            await this.setScanStarted();
        }


        try{
            console.log(`***************************first time feedTrans is working**************************************`,this.dbName);
            await this.scanFun();
        }catch(e){
            console.error(`first time feedTrans error. db:${this.dbName}, err:`,formatError(e));
        }

        // todo should open below code.
        let isRunning = false;
        setInterval(async () => {
            let self = this;
            if (isRunning) return;
            isRunning = true;

            try {
                console.log(`***************************feedTrans is working**************************************`,this.dbName);
                await self.scanFun();
            } catch (e) {
                console.error("feedTrans error",formatError(e));
            }finally {
                isRunning = false;
            }
        }, 20000);
    }

    async scanTonTxByTasks(tasks:Task[]){
        console.log("entering scanTonTxByTasks:",this.dbName,"tasks",JSON.stringify(tasks,bigIntReplacer));
        let retTask:Task[] = [];
        for(let i = tasks.length-1 ; i>= 0; i--){
            try{
                console.log("----------------------before scanTonTxByTask--------------","input task",tasks[i]);
                let retOneTask = await this.scanTonTxByTask(tasks[i])
                console.log("----------------------after scanTonTxByTask--------------","output tasks",retOneTask,"input task",tasks[i]);
                retTask.push(...retOneTask);
            }catch(err){
                console.log("scanTonTxByTasks err",formatError(err));
                retTask.push(tasks[i]);
            }
        }
        return retTask;
    }

    async scanTonTxByTask(task:Task) {
        let client:TonClient = await getClient();   //todo check how to provide config.
        let rawAddr = Address.parseFriendly(this.dbName).address
        console.log("entering scanTonTxByTask:", this.dbName,"rawAddr",rawAddr,"task", JSON.stringify(task, bigIntReplacer), "typeof task.rangeStart", typeof task.rangeStart);
        let rangeStartLt = BigInt(0);
        let rangeEndLt = BigInt(0);
        if (typeof task.rangeStart === "string") {
            let strTemp = String(task.rangeStart)
            rangeStartLt = strTemp[strTemp.length - 1] == 'n' ? BigInt(strTemp.slice(0, strTemp.length - 1)) : BigInt(strTemp);
        }
        if (typeof task.rangeStart === "bigint") {
            rangeStartLt = task.rangeStart;
        }

        if (typeof task.rangeEnd === "string") {
            let strTemp = String(task.rangeEnd)
            rangeEndLt = strTemp[strTemp.length - 1] == 'n' ? BigInt(strTemp.slice(0, strTemp.length - 1)) : BigInt(strTemp);
        }
        if (typeof task.rangeEnd === "bigint") {
            rangeEndLt = task.rangeEnd;
        }

        if (rangeEndLt >= maxLt) {
            let tranPovit :Transaction = null;
            //need split one task to two task by povilt trans.
            let optsOne: {
                limit: number;
                lt?: string;
                hash?: string;
                to_lt?: string;
                inclusive?: boolean;
                archival?: boolean;
            } = {
                limit: 1,
                archival: true,
            }
            let scAddress = Address.parse(this.dbName);
            try {
                let getSuccess = false
                let maxRetry = MAX_RETRY;
                while ((maxRetry-- > 0) && (!getSuccess)) {
                    try {

                        //let trans = await client.getTransactions(scAddress, optsOne)
                        let trans = await client.getTransactions(rawAddr, optsOne)
                        getSuccess = true;
                        console.log("get transcations one","optsOne",optsOne,"pivolt tran hash",trans[0].hash().toString('hex'));
                        tranPovit = trans[0];
                    } catch (e) {

                        console.error("get transcations one err ", formatError(e));
                        await sleep(2000);
                    }
                }
                if (maxRetry < 0) {
                    console.log(" get transcations one maxRetry == 0, before throw err");
                    throw new Error(formatUtil.format("fail by max_retry getTransactions one failed after %d retry. opts is %s", MAX_RETRY, JSON.stringify(optsOne)))
                }
                await sleep(2000);
            }catch(err){
                console.error("err", formatError(err));
                throw err;
            }
            let retTask = [];
            if(tranPovit?.lt > rangeStartLt){
                retTask.push({
                    //rangeStart:tranPovit?.lt - BigInt(MAX_BACKTRACE_SECONDS) > rangeStartLt ? tranPovit?.lt-BigInt(MAX_BACKTRACE_SECONDS) : rangeStartLt,
                    rangeStart:rangeStartLt,
                    rangeEnd:tranPovit?.lt,
                    rangeEndHash:tranPovit?.hash().toString('base64'),
                    rangeOpen:RangeOpen.CloseRange,
                });
            }
            retTask.push({
                rangeStart:tranPovit?.lt.toString(10),
                rangeEnd:rangeEndLt,
                rangeOpen:RangeOpen.CloseRange,
            });
            return retTask;
        }

        let rangeOpen = task.rangeOpen;
        let retTask:Task[] = [];
        let maxScanedLt = rangeStartLt;
        let minScanedLt = rangeEndLt;
        let minScannedHash = '';

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
            hash:task.rangeEndHash,
            inclusive:true,
        }
        let scAddress = Address.parse(this.dbName);

        let retraced = false;
        let nowTimeStamp = Math.floor((new Date()).getTime()/1000);
        let oldestTimeStamp = nowTimeStamp;
        try{
            while(transCount && !retraced){
                let getSuccess = false
                let insertSuccess = false
                let oldMaxScaanedLt = maxScanedLt;
                let oldMinScanedLt = minScanedLt;

                while((maxRetry-- >0) && (!getSuccess || !insertSuccess) ){
                    try{

                        console.log("maxRetry = %s, getSuccess = %s, insertSuccess=%s,transCount = %s, dbName = %s opts = %s",
                            maxRetry,getSuccess,insertSuccess,transCount,scAddress.toString(),JSON.stringify(opts,bigIntReplacer));

                        let ret = await client.getTransactions(rawAddr,opts)
                        getSuccess = true;

                        transCount = ret.length;
                        console.log("getTransactions success","opts",JSON.stringify(opts,bigIntReplacer),"len of getTransactions",transCount,"dbName",this.dbName);
                        for(let tran of ret){
                            console.log("(scanTonTxByTask) =====> tranHash = %s lt = %s",tran.hash().toString('base64'),tran.lt.toString(10),"dbName",this.dbName);
                            trans.push(tran);
                        }
                        if(ret.length){
                            opts.lt = ret[ret.length-1].lt.toString(10);
                            opts.hash = ret[ret.length-1].hash().toString('base64');
                            maxScanedLt = ret[0].lt > maxScanedLt ? ret[0].lt : maxScanedLt
                            minScanedLt = ret[ret.length-1].lt < minScanedLt ? ret[ret.length-1].lt : minScanedLt;
                            minScannedHash = ret[ret.length-1].hash().toString('base64');
                            let cci = (ret[ret.length-1].inMessage.info as unknown as CommonMessageInfoInternal);
                            //console.log("cci=>",cci);
                            oldestTimeStamp = cci.createdAt;
                        }
                        console.log("maxScanedLt",maxScanedLt,"minScanedLt",minScanedLt,"scAddress or dbName",this.dbName);

                        let tonTrans:TonTransaction[] = [];
                        console.log("before convertTranToTonTrans","db",this.dbName,"trans.length",trans?.length);
                        tonTrans = convertTranToTonTrans(trans);
                        console.log("before insertTrans","db",this.dbName,"tonTrans.length",tonTrans?.length);
                        await this.insertTrans(tonTrans);
                        trans = [];

                        insertSuccess = true;
                        maxRetry = retry;
                        console.log("scanTonTxByTask","oldestTimeStamp",oldestTimeStamp,"MAX_BACKTRACE_SECONDS",MAX_BACKTRACE_SECONDS,"nowTimeStamp",nowTimeStamp);
                        if(BigInt(oldestTimeStamp)+BigInt(MAX_BACKTRACE_SECONDS) < BigInt(nowTimeStamp)){
                            retraced = true;
                            console.log("scan finish because other are too older.");
                            break;
                        }
                    }catch(e){
                        maxScanedLt = oldMaxScaanedLt;
                        minScanedLt = oldMinScanedLt;

                        console.error("err ",formatError(e));
                        await sleep(2000);
                    }
                }
                if(maxRetry < 0){
                    console.log("maxRetry == 0, before throw err.XXXXXXXXXXXXXXX");
                    throw new Error(formatUtil.format("fail by max_retry getTransactions failed after %d retry. opts is %s",retry,JSON.stringify(opts)))
                }

                await sleep(2000);
                console.log("last loop transCount",transCount,"retry",maxRetry);
            }
        }catch(err){
            console.error("err",formatError(err));
            needSlitRange = true;
        }
        if(transCount ==0 || retraced){
            console.log("scan success","startLt",rangeStartLt.toString(10),"endLt",rangeEndLt.toString(10),"rangeOpen",rangeOpen);
            return retTask;
        }
        console.log("minScanedLt",minScanedLt,"maxScanedLt",maxScanedLt,"rangeStartLt",rangeStartLt,"rangeEndLt",rangeEndLt);
        if(maxScanedLt == rangeStartLt){ // no one tran scanned.
            retTask.push(task);
            return retTask;
        }
        if(needSlitRange){   // shrink the range
            if(rangeStartLt < minScanedLt){
                retTask.push({
                    rangeStart:rangeStartLt,
                    rangeEnd:minScanedLt,
                    rangeEndHash:minScannedHash,
                    rangeOpen:RangeOpen.CloseRange,
                });
            }
        }
        console.log(`after scanTonTxByTask, task`,JSON.stringify(retTask,bigIntReplacer),"dbName",this.dbName);
        return retTask;
    }



    async clearDb(){
        this.db.setState({}).write();
        await removeFile(this.fullFileName);
    }

    /////////////////////////////////////
    // read db
    /////////////////////////////////////

    async getAllTransNotHandled() {
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getAllTransNotHandled");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.error("getAllTransNotHandled", "err", formatError(err));
        } finally {
            release();
        }

        let result: TonTransaction[] = [];
        try {

            result = _.filter(copy, (item) => {
                return (item.emitEventOrNot == false);
            })
        } catch (err) {
            console.error("getAllTransNotHandled error","dbName",this.dbName,"err",formatError(err))
        } finally {
            copy = null;
        }
        return result;
    }

    async getTasks(){
        const release = await this.mutex.acquire();
        try {
            console.log("getTasks");
            return _.cloneDeep(this.db.get("scanTasks").value());
        }catch(err){
            console.log("getTasks","err",formatError(err));
        }
        finally {
            release();
        }
    }

    async getParentTx(tran:TonTransaction){
        //console.log("before getParentTx","dbName",this.dbName,"hash",tran.hash,"lt",tran.lt,"tonTran",JSON.stringify(tran,bigIntReplacer));
        console.log("before getParentTx","dbName",this.dbName,"hash",tran.hash,"lt",tran.lt,"tran.in",
            JSON.stringify(tran.in,bigIntReplacer),"tran.out",JSON.stringify(tran.out,bigIntReplacer));
        if(!tran){
            return null;
        }
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            copy = _.cloneDeep(this.db.get('trans').value());
        }catch(err){
            console.error("getParentTx","err",formatError(err));
        }
        finally {
            release();
        }

        let result :TonTransaction[] = [];
        try{
            result = _.filter(copy, (tonTran) =>{
                return _.some(tonTran.out, (item) => {
                    return (
                        (isAddressEqual(this.dbName,tran.in.src) && BigInt(item.createdLt) === tran.in.createdLt) &&
                        ((item.outMsgHash === tran.in.inMsgHash) || (item.outBodyHash == tran.in.inBodyHash))
                    );
                });
            });

        }catch(err){
            console.error("error getParentTx","err",formatError(err));
        }finally {
            copy = null;
        }
        console.log("after getParentTx","tran hash",tran.hash,"parent hash",result[0].hash,"dbName",this.dbName);
        return result;
    }

    async getChildTxs(tran:TonTransaction){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getChildTxs");
            copy = _.cloneDeep(this.db.get('trans').value());
        }catch(err){
            console.error("getChildTxs","err",formatError(err));
        }
        finally {
            release();
        }

        let result:TonTransaction[] = [];
        console.log("getChildTxs","db",this.dbName,"tran",tran);
       try{
            for(let i =0; i<tran.out.length;i++){
                console.log("getChildTxs","db",this.dbName,`tran${i}.out`,tran[i].out);
                let oneTran = _.filter(copy,(item)=>{
                    return (isAddressEqual(item.in.src,tran.out[i].dst)  &&
                        (item.in.inMsgHash == tran.out[i].outMsgHash || item.in.inBodyHash == tran.out[i].outBodyHash) &&
                    BigInt(item.in.createdLt) == tran.out[i].createdLt);
                })

                result.push(...oneTran);
            }
       }catch(err){
            console.error("getChildTxs err",formatError(err))
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
            console.error("getChildTxs", "err", formatError(err));
        } finally {
            release();
        }

        let result: TonTransaction = null;
        try {

            result = _.filter(copy, (item) => {
                return (item.hash == txHash);
            })
        } catch (err) {
            console.error("getTxByTxHash error","txHash",txHash,"dbName",this.dbName,"err",formatError(err))
        } finally {
            copy = null;
        }
        return result;
    }

    async getTxByHashLt(txHash: string,lt:string){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getTxByHashLt");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.error("getTxByHashLt", "err", formatError(err),"txHash",txHash,"lt",lt);
        } finally {
            release();
        }

        let result: TonTransaction = null;
        try {
            console.error("getTxByHashLt","txHash",txHash,"lt",lt,"dbName",this.dbName);
            result = _.filter(copy, (item) => {
                return ((item.hash == txHash) && item.lt == lt);
            })
        } catch (err) {
            console.error("getTxByHashLt", "err", formatError(err),"txHash",txHash,"lt",lt,"dbName",this.dbName);
        } finally {
            copy = null;
        }
        return result;
    }

    async getTxByMsg(msgHash:string,bodyHash:string,lt:bigint){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getTxByMsg");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.log("getTxByMsg", "err", formatError(err),"dbName",this.dbName,"msgHash",msgHash,"bodyHash",bodyHash,"lt",lt.toString(10));
        } finally {
            release();
        }

        let result: TonTransaction[] = [];
        try {
            result = _.filter(copy, (item) => {
                return (
                    (item.in.inMsgHash == msgHash || item.in.inBodyHash == bodyHash) &&
                    BigInt(item.in.createdLt) == lt);
            })
        } catch (err) {
            console.log("getTxByMsg", "err", formatError(err),"dbName",this.dbName,"msgHash",msgHash,"bodyHash",bodyHash,"lt",lt.toString(10));
        } finally {
            copy = null;
        }
        return result;
    }

    async getTxByOnlyMsgHash(msgHash:string){
        let copy = {};
        const release = await this.mutex.acquire();
        try {
            console.log("getTxByMsg");
            copy = _.cloneDeep(this.db.get('trans').value());
        } catch (err) {
            console.log("getTxByOnlyMsgHash", "err", formatError(err),"dbName",this.dbName,"msgHash",msgHash);
        } finally {
            release();
        }

        let result: TonTransaction[] = [];
        try {
            result = _.filter(copy, (item) => {
                return (
                    (item.in.inMsgHash == msgHash));
            })
        } catch (err) {
            console.log("getTxByOnlyMsgHash", "err", formatError(err),"dbName",this.dbName,"msgHash");
        } finally {
            copy = null;
        }
        return result;
    }
}

exports.DB = DB;