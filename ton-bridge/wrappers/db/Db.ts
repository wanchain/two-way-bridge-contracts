import {DBDataDir} from './common'
import path from 'path';
import {bigIntReplacer, ensureFileAndPath, ensurePath} from "../utils/utils";

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
        inMsgBodyHash:string,
        createdLt:bigint,
        createAt:bigint,
    },
    out:{
        outMsgs:{
            dst:string,
            outMsgHash:string,
            outBodyHash:string,
            createdLt:bigint,
            createAt:bigint,
        }[],
    },
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

    async insertTrans(trans:TonTransaction){
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
        try {
            console.log("Entering setTranHandleFlag");
            if(trans.length != finishOrNots.length || trans.length == 0 ){
                throw(new Error("setTranHandleFlag fail"))
            }
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

    // scan history and increased new trans into db.
    async feedTrans(){
        const release = await this.mutex.acquire();
        try {
            console.log("Entering feedTrans");
        }catch(err){
            console.log("setScanStarted","err",err);
        }
        finally {
            release();
        }

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

    async getParenTx(){
        const release = await this.mutex.acquire();
        try {
            console.log("getParenTx");
        }catch(err){
            console.log("getParenTx","err",err);
        }
        finally {
            release();
        }
    }

    async getChildTxs(msgHash:string,msgBodyHash:string,lt:string){
        const release = await this.mutex.acquire();
        try {
            console.log("getChildTxs");
        }catch(err){
            console.log("getChildTxs","err",err);
        }
        finally {
            release();
        }
    }
}