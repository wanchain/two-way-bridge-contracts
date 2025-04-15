import {DBAccess} from "./DbAccess";

const dbAccess:DBAccess = DBAccess.getDBAccess();
describe('DbAccess', () => {

    beforeAll(async () => {
        console.log("DbAccess beforeAll");
    },50000);

    it('DbAccess init', async () => {
        console.log("DbAccess init");
        await dbAccess.init();
    },500000);

});