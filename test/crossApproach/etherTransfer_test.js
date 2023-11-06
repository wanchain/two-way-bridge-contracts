const TestEtherTransfer = artifacts.require("TestEtherTransfer.sol");
const { assert } = require("chai");

const {
  ERROR_INFO,
} = require("./common");
const { web3 } = require("hardhat");


exports.testCases = () => {
  describe("Cross_EtherTransfer", function () {
    let sc
    before("deploy contract", async () => {
      sc = await TestEtherTransfer.new();
    });
    it("SendValue revert with EtherTransfer: insufficient balance", async () => {
      try {
        await sc.sendValue(global.aliceAccount.WAN, "1", "23000");
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "EtherTransfer: insufficient balance");
      }
    });

    it("SendValue revert with EtherTransfer: unable to send value, recipient may have reverted", async () => {
      try {
        const receiver = await TestEtherTransfer.new();
        await sc.setAcceptable(true);
        await web3.eth.sendTransaction({from: global.aliceAccount.WAN, to: sc.address, value:"100"});
        await sc.setAcceptable(false);
        await sc.sendValue(receiver.address, "100", "1");
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "EtherTransfer: unable to send value, recipient may have reverted");
      }
    });
  });
}