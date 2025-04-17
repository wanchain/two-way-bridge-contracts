const DB = require("../db/Db").DB;
const RangeOpen = require("../db/Db").RangeOpen;
let testDB;

const parentTx = {
    hash: "0x1234",
    lt: 1n,
    raw: '',
    in: {
        src: 'src',
        inMsgHash: 'inMsgHash',
        inBodyHash: 'inMsgBodyHash',
        createdLt: 1234n,
        createAt: 4n,
    },
    out: [{
        dst: 'src1',
        outMsgHash: 'outMsgHash1',
        outBodyHash: 'outBodyHash1',
        createdLt: 1234n,
        createAt: 3n,
    }, {
        dst: 'src2',
        outMsgHash: 'outMsgHash2',
        outBodyHash: 'outBodyHash2',
        createdLt: 5678n,
        createAt: 3n,
    }],
    emitEventOrNot: false,
}

const childTx1 = {
    hash: "0x5678",
    lt: 1n,
    raw: '',
    in: {
        src: 'src1',
        inMsgHash: 'outMsgHash1',
        inBodyHash: 'outBodyHash1',
        createdLt: 1234n,
        createAt: 4n,
    },
    out: [{
        dst: 'dst',
        outMsgHash: 'outMsgHash',
        outBodyHash: 'outBodyHash',
        createdLt: 2n,
        createAt: 3n,
    }],
    emitEventOrNot: false,
}

const childTx2 = {
    hash: "0x9abc",
    lt: 1n,
    raw: '',
    in: {
        src: 'src2',
        inMsgHash: 'outMsgHash2',
        inBodyHash: 'outBodyHash2',
        createdLt: 5678n,
        createAt: 4n,
    },
    out: [{
        dst: 'dst',
        outMsgHash: 'outMsgHash',
        outBodyHash: 'outBodyHash',
        createdLt: 2n,
        createAt: 3n,
    }],
    emitEventOrNot: false,
};

const ParentTrans = [
    parentTx, childTx1, childTx2
]

describe('DB', () => {


    beforeEach(async () => {
        console.log("DB beforeAll");
        testDB = new DB('test');
        await testDB.init('testDb');
    }, 50000);

    afterEach(async () => {
        console.log("clear DB");
        await testDB.clearDb();
        testDB = null;
    }, 50000);

    it('DB setScanStarted', async () => {
        console.log("DB setScanStarted");
        await testDB.setScanStarted();
    }, 500000);

    it('DB updateTasks', async () => {
        console.log("DB setScanStarted");
        let tasks = [
            {
                rangeStart: 2n,
                rangeEnd: 5n,
                rangeOpen: RangeOpen.RightOpenRange,
            },
            {
                rangeStart: 5n,
                rangeEnd: 6n,
                rangeOpen: RangeOpen.RightOpenRange,
            },
        ]
        await testDB.updateTask(tasks);
    }, 500000);

    it('DB updateTasks', async () => {
        console.log("DB updateTasks");
        let tasks = await testDB.getTasks();
        console.log(tasks);
    }, 500000);

    it('DB setTranHandleFlag', async () => {
        console.log("DB updateTasks");
        let tasks = await testDB.getTasks();
        console.log(tasks);
    }, 500000);

    it('DB insertTans', async () => {
        console.log("DB insertTans");
        let trans = [
            {
                hash: "0x1234",
                lt: 1n,
                raw: '',
                in: {
                    src: 'src',
                    inMsgHash: 'inMsgHash',
                    inBodyHash: 'inMsgBodyHash',
                    createdLt: 3n,
                    createAt: 4n,
                },
                out: [{
                    dst: 'dst',
                    outMsgHash: 'outMsgHash',
                    outBodyHash: 'outBodyHash',
                    createdLt: 2n,
                    createAt: 3n,
                }],
                emitEventOrNot: false,
            },
            {
                hash: "0x5678",
                lt: 1n,
                raw: '',
                in: {
                    src: 'src',
                    inMsgHash: 'inMsgHash',
                    inBodyHash: 'inMsgBodyHash',
                    createdLt: 3n,
                    createAt: 4n,
                },
                out: [{
                    dst: 'dst',
                    outMsgHash: 'outMsgHash',
                    outBodyHash: 'outBodyHash',
                    createdLt: 2n,
                    createAt: 3n,
                }],
                emitEventOrNot: false,
            },
        ]
        await testDB.insertTrans(trans);

    }, 500000);

    it('DB getParent', async () => {
        console.log("DB getParent");
        await testDB.insertTrans(ParentTrans);
        let parent = await testDB.getParenTx(childTx1);
        console.log("parent",parent);

        parent = await testDB.getParenTx(childTx2);
        console.log("parent",parent);

    }, 500000);

    it('DB getChildren', async () => {
        console.log("DB getChildren");
        await testDB.insertTrans(ParentTrans);
        let children = await testDB.getChildTxs(parentTx);
        console.log(children);
    }, 500000);

});