async function main(){
    const DB = require('../../db/Db').DB;
    console.log("Entering main function");
    let db = new DB('test');
    await db.init('test');
}

main();