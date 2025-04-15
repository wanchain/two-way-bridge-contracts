import {DB} from './Db';

import {DBDataDir} from './common'
import {listJsonFiles} from './common'

let dbAccess:DBAccess = null;
export class DBAccess {
    private dbs: Map<string, DB>;
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
        }
    }

    async clear(){
        for(let key of this.dbs.keys()){
            let db = this.dbs[key];
            await db.stopFeedTrans()
            db = null;
        }
        this.dbs.clear();
    }
    static getDBAccess() {
        if(dbAccess == null){
            dbAccess = new DBAccess();
        }else {
            return dbAccess;
        }
    }

    addDb(db:DB){
        this.dbs.set(db.getDbName(),db);
        (this.dbs[db.getDbName()]).feedTrans();
    }

    removeDb(db:DB){
        this.dbs.delete(db.getDbName());
        (this.dbs[db.getDbName()]).stopFeedTrans();
    }

}
