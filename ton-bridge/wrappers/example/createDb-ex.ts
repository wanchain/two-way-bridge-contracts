import {DB} from '../db/Db'

async function main(){
    console.log("Entering main function");
    let db = new DB('test');
    await db.init('test');
}

main();