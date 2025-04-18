import {DBAccess} from "./DbAccess";

const dbAccess:DBAccess = DBAccess.getDBAccess();
describe('DbAccess', () => {

    beforeAll(async () => {
        console.log("DbAccess beforeAll");
        await dbAccess.init();
    },50000);

    it('DbAccess init', async () => {
        console.log("DbAccess init");
        console.log('dbAccess',dbAccess);
    },500000);

    // it('DbAccess AddDb', async () => {
    //     console.log("DbAccess AddDb");
    //     for(let i = 0; i < 2; i++) {
    //         dbAccess.addDbByName("test"+i);
    //     }
    // },500000);

});