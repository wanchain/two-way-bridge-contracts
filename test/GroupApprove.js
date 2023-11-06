const { expect } = require("chai");

function encodeWithSignature(signature, ...args) {
    const functionName = signature.match(/^(\w+)\(/)[1];
    
    const functionSig = ethers.utils.id(signature).slice(0, 10);

    const iface = new ethers.utils.Interface([`function ${signature}`]);
    const encodedParameters = iface.encodeFunctionData(functionName, args);

    return functionSig + encodedParameters.slice(10);
}

let data = encodeWithSignature("upgradeTo(address)", "0x97f7ad39abF2C29535fCed267c6e12bf97CA7b00");
console.log('upgradeTo', data);
data = encodeWithSignature("transferOwner(address)", "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9");
console.log('transferOwner', data);
data = encodeWithSignature("transferFoundation(address)", "0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e");
console.log('transferFoundation', data);


describe("GroupApprove", function() {
    let groupApprove, mockCross, owner, foundation, signatureVerifier, oracle, other, secp256k1SchnorrVerifier;
    const chainId = 1337; // This is hardhat's default chainId for the local network

    beforeEach(async function() {
        [owner, foundation, other] = await ethers.getSigners();

        const IWanchainMPCMock = await ethers.getContractFactory("OracleDelegate");
        oracle = await IWanchainMPCMock.deploy();
        await oracle.deployed();

        const SignatureVerifier = await ethers.getContractFactory("SignatureVerifier");
        signatureVerifier = await SignatureVerifier.deploy();
        await signatureVerifier.deployed();

        const Secp256k1SchnorrVerifier = await ethers.getContractFactory("MokeSigVerifier");
        secp256k1SchnorrVerifier = await Secp256k1SchnorrVerifier.deploy();
        await secp256k1SchnorrVerifier.deployed();

        await signatureVerifier.register(1, secp256k1SchnorrVerifier.address);

        const MockCross = await ethers.getContractFactory("MockCross");
        mockCross = await MockCross.deploy(oracle.address, signatureVerifier.address, chainId.toString());
        await mockCross.deployed();

        const GroupApprove = await ethers.getContractFactory("GroupApprove");
        groupApprove = await GroupApprove.deploy(foundation.address, signatureVerifier.address, oracle.address, mockCross.address);
        await groupApprove.deployed();
    });

    it("Should set depend addresses correctly", async function() {
        expect(await groupApprove.foundation()).to.equal(foundation.address);
        expect(await groupApprove.oracle()).to.equal(oracle.address);
        expect(await groupApprove.chainId()).to.equal(chainId.toString());
        expect(await groupApprove.taskCount()).to.equal('0');
        expect(await groupApprove.signatureVerifier()).to.equal(signatureVerifier.address);
    });

    it("Should revert with foundation is empty", async function() {
        const GroupApprove = await ethers.getContractFactory("GroupApprove");
        await expect(GroupApprove.deploy("0x0000000000000000000000000000000000000000", signatureVerifier.address, oracle.address, mockCross.address)).to.be.revertedWith("foundation is empty");
    });

    it("Should revert with signatureVerifier not match", async function() {
        const GroupApprove = await ethers.getContractFactory("GroupApprove");
        await expect(GroupApprove.deploy(foundation.address, foundation.address, oracle.address, mockCross.address)).to.be.revertedWith("signatureVerifier not match");
    });

    it("Should revert with oracle not match", async function() {
        const GroupApprove = await ethers.getContractFactory("GroupApprove");
        await expect(GroupApprove.deploy(foundation.address, signatureVerifier.address, foundation.address, mockCross.address)).to.be.revertedWith("oracle not match");
    });

    it("Should revert with chainId is empty", async function() {
        const MockCross = await ethers.getContractFactory("MockCross");
        const cross = await MockCross.deploy(oracle.address, signatureVerifier.address, "0");
        await cross.deployed();

        const GroupApprove = await ethers.getContractFactory("GroupApprove");
        await expect(GroupApprove.deploy(foundation.address, signatureVerifier.address, oracle.address, cross.address)).to.be.revertedWith("chainId is empty");
    });

    it("Should proposal revert when foundation not match", async function() {
        await expect(groupApprove.proposal(chainId, mockCross.address, '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9')).to.be.revertedWith("not foundation");
    });

    it("Should proposal revert when chainId not match", async function() {
        await expect(groupApprove.connect(foundation).proposal('1101', mockCross.address, '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9')).to.be.revertedWith("chainId not match");
    });

    it("Should proposal revert when to address(0)", async function() {
        await expect(groupApprove.connect(foundation).proposal(chainId, '0x0000000000000000000000000000000000000000', '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9')).to.be.revertedWith("to is empty");
    });

    it("Should proposal revert when data is empty", async function() {
        await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, '0x')).to.be.revertedWith("data is empty");
    });

    it("Should proposal success", async function() {
        let data = '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9';
        await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, data)).to.be.emit(groupApprove, 'Proposal').withArgs('0', mockCross.address, data);
        expect(await groupApprove.taskCount()).to.equal('1');
        let task = await groupApprove.tasks('0');
        expect(task.to).to.equal(mockCross.address);
        expect(task.data).to.equal(data);
        expect(task.executed).to.equal(false);
    });

    it("Should proposal success 10 times", async function() {
        let data = '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9';
        for (let i=0; i<10; i++) {
            await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, data)).to.be.emit(groupApprove, 'Proposal').withArgs(i, mockCross.address, data);
            expect(await groupApprove.taskCount()).to.equal(i+1);
            let task = await groupApprove.tasks(i);
            expect(task.to).to.equal(mockCross.address);
            expect(task.data).to.equal(data);
            expect(task.executed).to.equal(false);
        }
    });

    it("Should approveAndExecute revert when smg is not ready", async function() {
        let data = '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9';
        await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, data)).to.be.emit(groupApprove, 'Proposal').withArgs('0', mockCross.address, data);
        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        try {
            await groupApprove.connect(foundation).approveAndExecute('0', smgId, r, s);
            expect.fail("Expected revert not received");
        } catch (error) {
            expect(error.toString()).includes('StoremanGroupNotReady');
        }
    });

    it("Should approveAndExecute revert when smg curveId not correct", async function() {
        let data = '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9';
        await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, data)).to.be.emit(groupApprove, 'Proposal').withArgs('0', mockCross.address, data);
        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [0,0], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        try {
            await groupApprove.connect(foundation).approveAndExecute('0', smgId, r, s);
            expect.fail("Expected revert not received");
        } catch (error) {
            expect(error.toString()).includes('curveId not correct');
        }
    });

    it("Should approveAndExecute revert when smg signature not correct", async function() {
        let data = '0x320432d4000000000000000000000000f6eb3cb4b187d3201afbf96a38e62367325b29f9';
        await expect(groupApprove.connect(foundation).proposal(chainId, mockCross.address, data)).to.be.emit(groupApprove, 'Proposal').withArgs('0', mockCross.address, data);
        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [1,1], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        try {
            await groupApprove.connect(foundation).approveAndExecute('0', smgId, r, s);
            expect.fail("Expected revert not received");
        } catch (error) {
            expect(error.toString()).includes('SignatureVerifyFailed');
        }
    });

    it("Should approveAndExecute revert with call failed", async function() {
        let data = encodeWithSignature("transferFoundation(address)", foundation.address)
        let proposalTx = await groupApprove.connect(foundation).proposal(chainId, mockCross.address, data);
        let receipt = await proposalTx.wait();
        let proposalLog = receipt.events.find(log => log.event == "Proposal");
        let proposalID = proposalLog.args.proposalId;

        await secp256k1SchnorrVerifier.setResult(true);

        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        await expect(groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s)).to.be.revertedWith("call failed");
        await secp256k1SchnorrVerifier.setResult(false);
    });

    it("Should approveAndExecute call failed by new foundation is empty", async function() {
        let data = encodeWithSignature("transferFoundation(address)", "0x0000000000000000000000000000000000000000");
        let proposalTx = await groupApprove.connect(foundation).proposal(chainId, groupApprove.address, data);
        let receipt = await proposalTx.wait();
        let proposalID = receipt.events.find(log => log.event == "Proposal").args.proposalId;

        await secp256k1SchnorrVerifier.setResult(true);

        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        await expect(groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s)).to.be.revertedWith("call failed");
        await secp256k1SchnorrVerifier.setResult(false);
    });

    it("Should approveAndExecute call failed by new foundation is same as old", async function() {
        let data = encodeWithSignature("transferFoundation(address)", foundation.address);
        let proposalTx = await groupApprove.connect(foundation).proposal(chainId, groupApprove.address, data);
        let receipt = await proposalTx.wait();
        let proposalID = receipt.events.find(log => log.event == "Proposal").args.proposalId;

        await secp256k1SchnorrVerifier.setResult(true);

        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        await expect(groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s)).to.be.revertedWith("call failed");
        await secp256k1SchnorrVerifier.setResult(false);
    });

    it("Should approveAndExecute task not exists", async function() {
        let proposalID = await groupApprove.taskCount();

        await secp256k1SchnorrVerifier.setResult(true);

        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        await expect(groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s)).to.be.revertedWith("task not exists");
        await secp256k1SchnorrVerifier.setResult(false);
    });

    it("Should approveAndExecute success", async function() {
        let data = encodeWithSignature("transferFoundation(address)", owner.address);
        let proposalTx = await groupApprove.connect(foundation).proposal(chainId, groupApprove.address, data);
        let receipt = await proposalTx.wait();
        let proposalLog = receipt.events.find(log => log.event == "Proposal");
        let proposalID = proposalLog.args.proposalId;

        await secp256k1SchnorrVerifier.setResult(true);

        let smgId = '0x000000000000000000000000000000000000000000746573746e65745f303534';
        let r = '0xbd2efe9fe71f4a5043f89fa05ad46f01a1aef059bf4206d097839c28dd23092d0000000000000000000000000000000000000000000000000000000000000000';
        let s = '0x3673314965225ae990879306b9ec6b3cc6c06bb188fc729a644d861b65b23d19';
        await oracle.setStoremanGroupConfig(smgId, 5, 0, [0,0], [1,1], '0x', '0x', parseInt(Date.now()/1000 - 600), parseInt(Date.now()/1000 + 600));
        let execTx = await groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s);
        receipt = await execTx.wait();
        let execLog = receipt.events.find(log => log.event == "ApprovedAndExecuted");
        expect(execLog.args.proposalId).to.equal(proposalID);

        data = encodeWithSignature("transferFoundation(address)", foundation.address);
        proposalTx = await groupApprove.connect(owner).proposal(chainId, groupApprove.address, data);
        receipt = await proposalTx.wait();
        proposalLog = receipt.events.find(log => log.event == "Proposal");
        proposalID = proposalLog.args.proposalId;
        await groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s);
        await execTx.wait();

        await expect(groupApprove.connect(foundation).approveAndExecute(proposalID, smgId, r, s)).to.be.revertedWith("task already executed");

        await secp256k1SchnorrVerifier.setResult(false);
    });

    it("Should halt revert when not foundation", async function() {
        await expect(groupApprove.connect(other).halt(mockCross.address, true)).to.be.revertedWith("not foundation");
    });

    it("Should halt success", async function() {
        await mockCross.transferOwnership(groupApprove.address);
        await groupApprove.connect(foundation).halt(mockCross.address, true);
        expect(await mockCross.halted()).to.equal(true);
    });

    it("Should transferFoundation revert when not self", async function() {
        await expect(groupApprove.connect(foundation).transferFoundation(other.address)).to.be.revertedWith("not self");
    });
});

