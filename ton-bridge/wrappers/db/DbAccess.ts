import {TonTransaction} from "./Db";

const DB = require("../db/Db").DB;
const RangeOpen = require("../db/Db").RangeOpen;

import {convertTonTransToTrans, DBDataDir} from './common'
import {listJsonFiles} from './common'

let dbAccess:DBAccess = null;

async function runAsyncTask(db:typeof DB) {
    await db.feedTrans();
}

export class DBAccess {
    private dbs: Map<string, typeof DB>;
    constructor() {
        this.dbs = new Map();
    }

    async init(){
        let dbNames:string[] = [];
        listJsonFiles(DBDataDir,dbNames);
        for(let dbName of dbNames){
            let db = new DB(dbName);
            await db.init(dbName);
            this.dbs[dbName] = db;
            await runAsyncTask(db);
        }
    }

    async clear(){
        for(let key of this.dbs.keys()){
            let db = this.dbs[key];
            await db.stopFeedTrans()
            await db.clearDb();
            db = null;
        }
        this.dbs.clear();
    }

    static getDBAccess() {
        if(dbAccess == null){
            dbAccess = new DBAccess();
            return dbAccess;
        }else {
            return dbAccess;
        }
    }

    async addDbByName(dbName:string){
        console.log("before addDbByName","dbName",dbName,"dbs",this.dbs);
        if(this.has(dbName)){
            throw new Error(`db ${dbName} already exists`);
        }
        let db = new DB(dbName);
        await db.init(dbName);
        this.dbs.set(db.getDbName(),db);
        console.log("after addDbByName","dbName",dbName,"dbs",this.dbs);
        await runAsyncTask(db);
    }

    async removeDbByName(dbName:string){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        this.dbs.delete(dbName);
        await (this.dbs[dbName]).stopFeedTrans();
    }

    async setTranHandleFlag(dbName:string,tran:TonTransaction,finishOrNot:boolean){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        await this.dbs.get(dbName).setTranHandleFlag(tran,finishOrNot);
    }

    async getTxByTxHash(dbName:string,txHash: string) {
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        await this.dbs.get(dbName).getTxByTxHash(txHash);
    }

    async getTxByMsg(dbName:string,msgHash:string,bodyHash:string,lt:bigint){
        console.log("Entering getTxByMsg........","dbName",dbName,"msgHash",msgHash,"bodyHash",bodyHash,"lt",lt.toString(10));
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let tonTran = await this.dbs.get(dbName).getTxByMsg(msgHash,bodyHash,lt);
        if(!tonTran || (tonTran.length  == 0) ){
            return null;
        }
        return (convertTonTransToTrans(tonTran))[0];
    }

    async getParentTx(dbName:string,tran:TonTransaction){

        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let ret = await this.dbs.get(dbName).getParentTx(tran);
        if(!ret || ret.length == 0) {
            return null;
        }else{
            return convertTonTransToTrans(ret)[0];
        }
    }

    async getChildTxs(dbName:string,tran:TonTransaction){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let ret = await this.dbs.get(dbName).getChildTxs(tran);
        if(!ret || ret.length == 0) {
            return null;
        }else{
            return convertTonTransToTrans(ret);
        }
    }

    has(dbName:string){
        return this.dbs.has(dbName);
    }
}
