import {DBAccess} from "./DbAccess";
let dbAccess = null;

describe('DbAccess', () => {
    beforeAll(async () => {
        console.log("DbAccess beforeAll");
        dbAccess = await DBAccess.getDBAccess();
    },50000);

    it('DbAccess init', async () => {
        console.log("DbAccess init");
        console.log('dbAccess',dbAccess);
        await dbAccess.init();
    },500000);

    // it('DbAccess AddDb', async () => {
    //     console.log("DbAccess AddDb");
    //     for(let i = 0; i < 2; i++) {
    //         dbAccess.addDbByName("test"+i);
    //     }
    // },500000);

});