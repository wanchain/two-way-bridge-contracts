const DB = require("../db/Db").DB;
const RangeOpen = require("../db/Db").RangeOpen;

import {DBDataDir} from './common'
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
        let db = new DB(dbName);
        await db.init(dbName);
        this.dbs.set(db.getDbName(),db);
        await runAsyncTask(db);
    }

    async removeDbByName(dbName:string){
        this.dbs.delete(dbName);
        await (this.dbs[dbName]).stopFeedTrans();
    }

}
