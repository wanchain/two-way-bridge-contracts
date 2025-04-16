// import { Low } from 'lowdb';

import _ from 'lodash';
import {DBDataDir} from './common'
import path from 'path';

const minLt = BigInt(0)
const maxLt = BigInt(2^256-1)

enum RangeOpen {
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
    }
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

import low, { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

export class DB {
    private readonly dbName: string;
    private db = null;
    constructor(dbName:string) {
        this.dbName = dbName;
        this.db = null;
    }

    getDbName() {
        return this.dbName;
    }

    async init(dbName:string) {

        const low = require('lowdb')
        const FileSync = require('lowdb/adapters/FileSync')

        const adapter = new FileSync(path.join(...[DBDataDir,dbName+'.json']))
        this.db = low(adapter)
    }
}


/*
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ posts: [] })
  .write()

const result = db.get('posts')
  .push({ name: process.argv[2] })
  .write()

console.log(result)
 */


/*export class DB {
    private dbName: string;
    private db: Low<Data>;
    constructor(dbName:string) {
        this.dbName = dbName;
        this.db = null;
    }

    getDbName() {
        return this.dbName;
    }

    async init(dbName:string) {
        const adapter = new JSONFile<Data>(path.join(...[DBDataDir,dbName,'.json']));
        this.db = new Low(adapter,defaultData)
    }

    async stopFeedTrans(){
        console.log("Entering stopFeedTrans");
    }

    /////////////////////////////////////
    // write db
    /////////////////////////////////////
    async updateTask(tasks:Task[]){
        console.log("Entering updateTask");
    }

    async setTranHandleFlag(tran:TonTransaction,finishOrNot:boolean){
        console.log("Entering setTranHandleFlag");
        try{
            await this.db.read()
            let copy = _.cloneDeep(this.db.data)
            await this.db.update(copy=>{
                const index  = _.findIndex(copy.trans,{hash:tran.hash,lt:tran.lt})
                if (index !== -1) {
                    _.set(copy.trans[index], 'emitEventOrNot', finishOrNot);
                }
            });
        }catch(err){
            console.log("setTranHandleFlag","err",err);
        }
    }

    async setTranHandleFlags(trans:TonTransaction[],finishOrNots:boolean[]){
        console.log("Entering setTranHandleFlags");
        if(trans.length != finishOrNots.length || trans.length == 0 ){
            throw(new Error("setTranHandleFlags fail"))
        }
        for(let i = 0;i < trans.length; i++){
            await this.setTranHandleFlag(trans[i],finishOrNots[i]);
        }
    }

    // isInitial (true->false)
    async setScanStarted(){
        console.log("Entering setScanStarted");
        try{
            await this.db.read()
            let copy = _.cloneDeep(this.db.data)
            copy.isInitial = false;
            await this.db.update(copy=>{
                copy.isInitial = true;
            });
        }catch(err){
            console.log("setScanStarted","err",err);
        }

    }

    // scan history and increased new trans into db.
    async feedTrans(){
        console.log("Entering feedTrans");
    }


    /////////////////////////////////////
    // read db
    /////////////////////////////////////
    async getParenTx(){
        console.log("Entering getParenTx");
        let ret:TonTransaction = null;
        return ret;
    }

    async getChildTxs(msgHash:string,msgBodyHash:string,lt:string){
        console.log("Entering getChildTxs");
        let ret:TonTransaction[];
        await this.db.read();
        return ret
    }
}*/
