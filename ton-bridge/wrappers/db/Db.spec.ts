import {DB} from "./Db";
let testDB :DB ;

describe('DB', () => {

    beforeAll(async () => {
        console.log("DbAccess beforeAll");
        testDB = new DB('test');
    },50000);

    it('DB init', async () => {
        console.log("DB init");
        //await testDB.init('testDb');
    },500000);

});