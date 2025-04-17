const DB = require("../db/Db").DB;
const RangeOpen = require("../db/Db").RangeOpen;
let testDB;
describe('DB', () => {

    beforeAll(async () => {
        console.log("DB beforeAll");
        testDB = new DB('test');
        await testDB.init('testDb');
    },50000);

    it('DB init', async () => {
        console.log("DB init");
        await testDB.init('testDb');
    },500000);

    it('DB setScanStarted', async () => {
        console.log("DB setScanStarted");
        await testDB.setScanStarted();
    },500000);

    it('DB updateTasks', async () => {
        console.log("DB setScanStarted");
        let tasks = [
            {
                rangeStart:2n,
                rangeEnd:5n,
                rangeOpen:RangeOpen.RightOpenRange,
            },
            {
                rangeStart:5n,
                rangeEnd:6n,
                rangeOpen:RangeOpen.RightOpenRange,
            },
        ]
        await testDB.updateTask(tasks);
    },500000);

    it('DB updateTasks', async () => {
        console.log("DB updateTasks");
        let tasks = await testDB.getTasks();
        console.log(tasks);
    },500000);

    it('DB setTranHandleFlag', async () => {
        console.log("DB updateTasks");
        let tasks = await testDB.getTasks();
        console.log(tasks);
    },500000);

    it('DB insertTans', async () => {
        console.log("DB insertTans");
        let trans = [
            {
                hash: "0x1234",
                lt:1n,
                raw:'',
                in:{
                    src: 'src',
                    inMsgHash:'inMsgHash',
                    inMsgBodyHash:'inMsgBodyHash',
                    createdLt:3n,
                    createAt:4n,
                },
                out:{
                    outMsgs:
                    [{
                        dst:'dst',
                        outMsgHash:'outMsgHash',
                        outBodyHash:'outBodyHash',
                        createdLt:2n,
                        createAt:3n,
                    }],
                },
                emitEventOrNot:false,
            },
            {
                hash: "0x5678",
                lt:1n,
                raw:'',
                in:{
                    src: 'src',
                    inMsgHash:'inMsgHash',
                    inMsgBodyHash:'inMsgBodyHash',
                    createdLt:3n,
                    createAt:4n,
                },
                out:{
                    outMsgs:[{
                        dst:'dst',
                        outMsgHash:'outMsgHash',
                        outBodyHash:'outBodyHash',
                        createdLt:2n,
                        createAt:3n,
                    }],
                },
                emitEventOrNot:false,
            },
        ]
        await testDB.insertTrans(trans);

    },500000);
});