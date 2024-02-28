const {g, setupNetwork,} = require('../base.js');
const {ethers} = require('hardhat');
const {assert} = require('chai');

let fakeSmg;
let polyCommitLen;
const bytes32 = "0000000000000000000000000000000000000031353839393533323738313235"
const bytes64 = bytes32+bytes32
const GrpId = "0x0000000000000000000000000000000000000031353839393533323738313235";
const bytes192 = "0x"+bytes64+bytes64+bytes64

const DataForTest = [
    {grpId: GrpId,  curveIndex: 0, polyCommit: bytes192, expected: "check len success"},
    {grpId: GrpId,  curveIndex: 0, polyCommit: bytes192.slice(0, bytes192.length-2), expected: "Invalid commit length"}, //too less
    {grpId: GrpId,  curveIndex: 0, polyCommit: bytes192 + "00", expected: "Invalid commit length"},  // too long
    {grpId: GrpId,  curveIndex: 1, polyCommit: "0x"+bytes64, expected: "check len success"},
    {grpId: GrpId,  curveIndex: 1, polyCommit: "0x"+bytes64+"00", expected: "Invalid commit length"}, // too long
    {grpId: GrpId,  curveIndex: 1, polyCommit: "0x"+bytes64.slice(0,bytes64.length-2), expected: "Invalid commit length"},
    {grpId: GrpId,  curveIndex: 2, polyCommit: bytes192, expected: "check len success"},
    {grpId: GrpId,  curveIndex: 2, polyCommit: bytes192.slice(0, bytes192.length-2), expected: "Invalid commit length"}, //too less
    {grpId: GrpId,  curveIndex: 2, polyCommit: bytes192 + "00", expected: "Invalid commit length"},  // too long
] //too less

contract('PolyCommitLen_UT', async (accounts) => {
    let owner, admin;

    before("should do all preparations", async () => {

        let FakeSmg = await ethers.getContractFactory("FakeSmg");
        fakeSmg = await FakeSmg.deploy()
        await fakeSmg.deployed();

        let PolyCommitLen = await ethers.getContractFactory("TestPolyCommitLen");
        polyCommitLen = await PolyCommitLen.deploy(fakeSmg.address)
        await polyCommitLen.deployed();

        // network
        await setupNetwork();

    })

    it('[PolyCommitLen_UT] test all', async () => {
        let index = 0
        for (let item of DataForTest) {
            index++
            let result = {};
            try {
                console.log("-------------------------------")
                let retSmg = await fakeSmg.getThresholdByGrpId(item.grpId)
                console.log("threshold ",retSmg.toString(10))

                let retCurvs = await polyCommitLen.curve(item.grpId,item.curveIndex)
                console.log("Curv:  ",retCurvs.toString(10))

                let retAlgos = await polyCommitLen.algo(item.grpId,item.curveIndex)
                console.log("Algo:  ",retAlgos.toString(10))

                result = await polyCommitLen.CheckPolyCommitLen(item.grpId,item.curveIndex,item.polyCommit);

            } catch (e) {
                result = e.reason;
            }
            console.log("item index",index,"result",result.toString())
            console.log("-------------------------------")
            assert.include(result.toString(), item.expected);
        }
    })
})
