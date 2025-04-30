import {TonTransaction} from "./Db";

const DB = require("../db/Db").DB;
const RangeOpen = require("../db/Db").RangeOpen;

import {convertTonTransToTrans, DBDataDir} from './common'
import {listJsonFiles} from './common'
import {Address} from "@ton/core";
import {getGlobalTonConfig} from "../client/client";

let dbAccess:DBAccess = null;

async function runAsyncTask(db:typeof DB) {
    await db.feedTrans();
}

export class DBAccess {
    private dbs: Map<string, typeof DB>;
    private inited: boolean;
    constructor() {
        this.dbs = new Map();
        this.inited = false;
    }

    async init(){
        if(this.inited){
            return;
        }
        let dbNames:string[] = [];
        listJsonFiles(DBDataDir,dbNames);
        for(let dbName of dbNames){
            let db = new DB(dbName);
            await db.init(dbName);
            this.dbs.set(dbName,db);
            await runAsyncTask(db);
        }
        this.inited = true;
    }

    async clear(){
        for(let key of this.dbs.keys()){
            let db = this.dbs.get(key);
            await db.stopFeedTrans()
            await db.clearDb();
            db = null;
        }
        this.dbs.clear();
    }

    static getDBAccess() {
        if (!getGlobalTonConfig().usingDbCache) {
            return null
        }

        if (dbAccess == null) {
            dbAccess = new DBAccess();
            return dbAccess;
        } else {
            return dbAccess;
        }
    }

    async addDbByName(dbName:string){
        console.log("before addDbByName","dbName",dbName,"dbs.length",this.dbs.size);
        if(this.has(dbName)){
            throw new Error(`db ${dbName} already exists`);
        }
        let dbNameFinal = this.getDbNameFinal(dbName);
        let db = new DB(dbNameFinal);
        await db.init(dbNameFinal);
        this.dbs.set(db.getDbName(),db);
        console.log("after addDbByName","dbName",dbName,"dbNameFinal",dbNameFinal,"dbs.length",this.dbs.size);
        await runAsyncTask(db);
    }

    async removeDbByName(dbName:string){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }

        await (this.dbs.get(this.getDbNameFinal(dbName))).stopFeedTrans();
        this.dbs.delete(this.getDbNameFinal(dbName));
    }

    async setTranHandleFlag(dbName:string,tran:TonTransaction,finishOrNot:boolean){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        await this.dbs.get(this.getDbNameFinal(dbName)).setTranHandleFlag(tran,finishOrNot);
    }

    async getTxByTxHash(dbName:string,txHash: string) {
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let tonTran = await this.dbs.get(this.getDbNameFinal(dbName)).getTxByTxHash(txHash);
        if(!tonTran || (tonTran.length  == 0) ){
            return null;
        }
        return (convertTonTransToTrans(tonTran))[0];
    }

    async getTxByHashLt(dbName:string,txHash: string,lt:string) {
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let tonTran = await this.dbs.get(this.getDbNameFinal(dbName)).getTxByHashLt(txHash,lt);
        if(!tonTran || (tonTran.length  == 0) ){
            return null;
        }
        return (convertTonTransToTrans(tonTran))[0];
    }

    async getTxByMsg(dbName:string,msgHash:string,bodyHash:string,lt:bigint){
        console.log("Entering getTxByMsg........","dbName",dbName,"msgHash",msgHash,"bodyHash",bodyHash,"lt",lt.toString(10));
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let tonTran = await this.dbs.get(this.getDbNameFinal(dbName)).getTxByMsg(msgHash,bodyHash,lt);
        if(!tonTran || (tonTran.length  == 0) ){
            return null;
        }
        return (convertTonTransToTrans(tonTran))[0];
    }

    async getParentTx(dbName:string,tran:TonTransaction){

        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let ret = await this.dbs.get(this.getDbNameFinal(dbName)).getParentTx(tran);
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
        let ret = await this.dbs.get(this.getDbNameFinal(dbName)).getChildTxs(tran);
        if(!ret || ret.length == 0) {
            return null;
        }else{
            return convertTonTransToTrans(ret);
        }
    }

    async getAllTransNotHandled(dbName:string){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let ret = await this.dbs.get(this.getDbNameFinal(dbName)).getAllTransNotHandled();
        if(!ret || ret.length == 0) {
            return null;
        }else{
            return convertTonTransToTrans(ret);
        }
    }

    async getTxByOnlyMsgHash(dbName:string,msgCellHash:string){
        if(!this.has(dbName)){
            throw new Error(`db ${dbName} not exists`);
        }
        let ret = await this.dbs.get(this.getDbNameFinal(dbName)).getTxByOnlyMsgHash(msgCellHash);
        if(!ret || ret.length == 0) {
            return null;
        }else{
            return convertTonTransToTrans(ret);
        }
    }

    getDbNameFinal(dbName:string){
        let dbNameFinal = dbName;
        if(Address.parse(dbName).toString()  != dbName){
            dbNameFinal = Address.parse(dbName).toString()
        }
        return dbNameFinal;
    }
    has(dbName:string){
        let dbAliasName = Address.parse(dbName).toString();
        return this.dbs.has(dbName) || this.dbs.has(dbAliasName);
    }
}
