const { expect } = require("chai");

function encodeWithSignature(signature, ...args) {
    const functionName = signature.match(/^(\w+)\(/)[1];
    
    const functionSig = ethers.utils.id(signature).slice(0, 10);

    const iface = new ethers.utils.Interface([`function ${signature}`]);
    const encodedParameters = iface.encodeFunctionData(functionName, args);

    return functionSig + encodedParameters.slice(10);
}

const data = encodeWithSignature("transferFoundation(address)", "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9");
console.log(data);


// describe("SmgMultiSigCtrl", function() {
//     let smgMultiSigCtrl, ihaltMock, owner, foundation, signatureVerifier, oracle, other;
//     const chainId = 1337; // This is hardhat's default chainId for the local network

//     beforeEach(async function() {
//         [owner, foundation, other] = await ethers.getSigners();

//         const IWanchainMPCMock = await ethers.getContractFactory("OracleDelegate");
//         oracle = await IWanchainMPCMock.deploy();
//         await oracle.deployed();

//         const SignatureVerifier = await ethers.getContractFactory("SignatureVerifier");
//         signatureVerifier = await SignatureVerifier.deploy();
//         await signatureVerifier.deployed();

//         const IHaltMock = await ethers.getContractFactory("Halt");
//         ihaltMock = await IHaltMock.deploy();
//         await ihaltMock.deployed();

//         const SmgMultiSigCtrl = await ethers.getContractFactory("SmgMultiSigCtrl");
//         smgMultiSigCtrl = await SmgMultiSigCtrl.deploy(foundation.address, signatureVerifier.address, oracle.address, chainId);
//         await smgMultiSigCtrl.deployed();
//     });

//     describe("Deployment", function() {
//         it("Should set foundation correctly", async function() {
//             expect(await smgMultiSigCtrl.foundation()).to.equal(foundation.address);
//         });
        
//         // Add more deployment-related tests if needed
//     });

//     describe("Functions", function() {
//         // Example test for smgSchedule
//         it("Should allow scheduling by Storeman Group with correct signature", async function() {
//             // Set up mock conditions and data for the test
//             // ...

//             // Call smgSchedule
//             // ...

//             // Verify the result
//             // ...
//         });

//         it("Should failed when approve an none exist proposal", async function() {
//             await expect(smgMultiSigCtrl.connect(foundation).approveAndExecute('0x0000000000000000000000000000000000000000000000000000000000000000')).to.be.revertedWith("task not exists");
//         });

//         it("Should transfer foundation to new address", async function() {
//             await smgMultiSigCtrl.connect(foundation).transferFoundation(other.address);
//             expect(await smgMultiSigCtrl.foundation()).to.equal(other.address);
//         });

//         // You can add more tests for other functions in a similar manner
//     });

//     describe("Modifiers", function() {
//         it("Should not allow non-foundation accounts to call functions with onlyFoundation modifier", async function() {
//             await expect(smgMultiSigCtrl.connect(other).halt(ihaltMock.address, true)).to.be.revertedWith("not foundation");
//         });
//     });
// });

